import { useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { Button, Card, Pagination, Table, Tag } from "antd";
import type { TableColumnsType } from "antd";
import { Link } from "react-router-dom";
import { QueryError } from "../components/common";
import { completeBank, WithdrawalReviewDialog } from "../components/WithdrawalReviewDialog";
import { date, money } from "../lib/format";
import type { AdminWithdrawal, DashboardAnomaly, DashboardSummary, Page } from "../types";

export function WithdrawalQueue({ query, page, onPageChange }: {
  query: UseQueryResult<Page<AdminWithdrawal>>;
  page: number;
  onPageChange: (page: number) => void;
}) {
  const [selected, setSelected] = useState<AdminWithdrawal | null>(null);
  const data = query.data;
  const columns: TableColumnsType<AdminWithdrawal> = [
    { title: "Tài xế", key: "driver", render: (_, row) => (
      <div className="dashboard-cell-stack">
        <Link to={`/drivers/${row.driverId}`} state={{ from: "/dashboard" }}>{row.driverName || `Tài xế #${row.driverId}`}</Link>
        <span>#{row.id} · {date(row.createdAt)}</span>
      </div>
    ) },
    { title: "Số tiền", key: "amount", align: "right", render: (_, row) => <strong className="dashboard-nowrap">{money(row.amount)}</strong> },
    { title: "Thao tác", key: "action", width: 84, align: "right", render: (_, row) => (
      <Button size="small" type="primary" aria-label={`Duyệt yêu cầu #${row.id}`} disabled={query.isError || !completeBank(row) || !!selected} onClick={() => setSelected(row)}>Duyệt</Button>
    ) },
  ];

  return (
    <Card className="dashboard-panel dashboard-table-panel" title={<h3>Yêu cầu rút tiền chờ duyệt</h3>} extra={data && <Tag color="blue">{data.totalElements} yêu cầu</Tag>}>
      <QueryError error={query.error} retry={() => void query.refetch()} />
      <Table
        size="small" rowKey="id" columns={columns} dataSource={data?.content}
        pagination={false} loading={query.isPending} scroll={{ x: 320 }}
        locale={{ emptyText: query.isError ? "Chưa tải được danh sách." : "Không có yêu cầu rút tiền chờ duyệt." }}
      />
      {data && page >= data.totalPages && page > 0 ? (
        <Button type="link" onClick={() => onPageChange(0)}>Về trang đầu</Button>
      ) : data && data.totalPages > 1 && (
        <Pagination className="dashboard-queue-pagination" size="small" current={page + 1} pageSize={data.size} total={data.totalElements} showSizeChanger={false} onChange={(next) => onPageChange(next - 1)} />
      )}
      {selected && (
        <WithdrawalReviewDialog target={{ request: selected, action: "APPROVE" }} query={query} onClose={() => setSelected(null)} onCompleted={() => onPageChange(0)} />
      )}
    </Card>
  );
}

const anomalyColumns: TableColumnsType<DashboardAnomaly> = [
  { title: "Cảnh báo", key: "kind", render: (_, row) => row.kind === "HIGH_FARE" ? (
    <div className="dashboard-cell-stack">
      <Link to={`/rides/${row.subjectId}`} state={{ from: "/dashboard" }}>Chuyến #{row.subjectId}</Link>
      <span>Giá trị cao</span>
    </div>
  ) : (
    <div className="dashboard-cell-stack">
      <Link to={`/customers/${row.subjectId}?tab=rides`} state={{ from: "/dashboard" }}>Khách #{row.subjectId}</Link>
      <span>Hủy nhiều chuyến</span>
    </div>
  ) },
  { title: "Chi tiết", key: "value", align: "right", render: (_, row) => (
    <div className="dashboard-cell-stack">
      <strong className="dashboard-nowrap">{row.kind === "HIGH_FARE" ? money(row.value) : `${row.value} lần hủy`}</strong>
      <span>{date(row.occurredAt)}</span>
    </div>
  ) },
];

export function DashboardAnomalies({ query }: { query: UseQueryResult<DashboardSummary> }) {
  return (
    <Card className="dashboard-panel dashboard-table-panel" title={<h3>Giao dịch cần kiểm tra</h3>}>
      <p className="dashboard-table-description">Chuyến từ 1.000.000 ₫ hoặc khách tự hủy từ 3 chuyến trong kỳ. Hiển thị 5 cảnh báo mới nhất.</p>
      <Table
        size="small" rowKey={(row) => `${row.kind}-${row.subjectId}`} columns={anomalyColumns} dataSource={query.data?.anomalies}
        pagination={false} loading={query.isPending} scroll={{ x: 280 }}
        locale={{ emptyText: query.isError ? "Chưa tải được cảnh báo." : "Không có cảnh báo trong kỳ." }}
      />
    </Card>
  );
}
