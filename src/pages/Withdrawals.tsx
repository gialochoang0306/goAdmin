import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Select, Space, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Link, useLocation } from "react-router-dom";
import { SearchDateFields, listSearch } from "../components/SearchDateFields";
import { FilterField } from "../components/FilterField";
import { DataTable, Heading, Panel, QueryError, Refresh, UpdatedAt } from "../components/common";
import { completeBank, WithdrawalReviewDialog, type WithdrawalReviewTarget } from "../components/WithdrawalReviewDialog";
import { api } from "../lib/api";
import { date, money } from "../lib/format";
import { useFilters } from "../lib/hooks";
import type { AdminWithdrawal, WithdrawalStatus } from "../types";

const statuses: { value: WithdrawalStatus | "ALL"; label: string }[] = [
  { value: "PENDING", label: "Chờ duyệt" }, { value: "SUCCESS", label: "Đã chuyển tiền" },
  { value: "REJECTED", label: "Đã từ chối" }, { value: "ALL", label: "Tất cả trạng thái" },
];

export default function Withdrawals() {
  const filters = useFilters();
  const location = useLocation();
  const search = listSearch(filters);
  const rawStatus = filters.read("status", "PENDING");
  const status = rawStatus;
  const [review, setReview] = useState<WithdrawalReviewTarget | null>(null);
  const query = useQuery({
    queryKey: ["admin", "withdrawals", filters.page, filters.size, status, search.params],
    queryFn: () => api.withdrawals({ page: filters.page, size: filters.size, ...search.params, status: status === "ALL" ? undefined : status }),
    enabled: !search.error,
    refetchInterval: 15000, refetchOnWindowFocus: "always",
  });
  const columns: ColumnsType<AdminWithdrawal> = [
    { title: "Yêu cầu", key: "id", width: 140, render: (_, item) => <Space orientation="vertical" size={0}><Typography.Text strong>#{item.id}</Typography.Text><Typography.Text type="secondary">{date(item.createdAt)}</Typography.Text></Space> },
    { title: "Tài xế", key: "driver", width: 190, render: (_, item) => <Space orientation="vertical" size={0}><Link to={`/drivers/${item.driverId}`} state={{from:location.pathname + location.search}}>{item.driverName || `Tài xế #${item.driverId}`}</Link><Typography.Text type="secondary">{item.driverPhoneNumber || "Chưa có số điện thoại"}</Typography.Text></Space> },
    { title: "Tài khoản nhận tiền", key: "bank", width: 240, render: (_, item) => <Space orientation="vertical" size={0}><Typography.Text>{item.bankName || "Chưa có ngân hàng"}</Typography.Text><Typography.Text copyable={item.bankAccountNumber ? { text: item.bankAccountNumber } : false}>{item.bankAccountNumber || "Chưa có số tài khoản"}</Typography.Text>{!completeBank(item) && <Typography.Text type="danger">Cần bổ sung thông tin ngân hàng</Typography.Text>}</Space> },
    { title: "Số tiền", dataIndex: "amount", width: 150, align: "right", render: value => <Typography.Text strong>{money(value)}</Typography.Text> },
    { title: "Trạng thái", key: "status", width: 210, render: (_, item) => <Space orientation="vertical" size={4}><Tag color={item.status === "SUCCESS" ? "green" : item.status === "REJECTED" ? "red" : "gold"}>{statuses.find(s => s.value === item.status)?.label ?? item.status}</Tag>{item.reviewedAt && <Typography.Text type="secondary">{date(item.reviewedAt)} · Admin #{item.reviewedBy}</Typography.Text>}{item.rejectReason && <Typography.Text>Lý do: {item.rejectReason}</Typography.Text>}</Space> },
    { title: "Thao tác", key: "actions", width: 190, render: (_, item) => item.status === "PENDING" ? <Space wrap><Button type="primary" disabled={query.isError || !!review || !completeBank(item)} aria-label={`Duyệt yêu cầu #${item.id}`} onClick={() => setReview({ request: item, action: "APPROVE" })}>Duyệt</Button><Button danger disabled={query.isError || !!review} aria-label={`Từ chối yêu cầu #${item.id}`} onClick={() => setReview({ request: item, action: "REJECT" })}>Từ chối</Button></Space> : <Typography.Text type="secondary">Đã xử lý</Typography.Text> },
  ];
  return <>
    <Heading title="Yêu cầu rút tiền" subtitle="Kiểm tra tài khoản nhận tiền và xử lý yêu cầu rút từ ví tiền mặt của tài xế." actions={<Refresh loading={query.isFetching} onClick={() => void query.refetch()} />} />
    <Panel>
      <div className="filters">
        <SearchDateFields filters={filters} label="Tìm yêu cầu rút tiền" placeholder="Mã yêu cầu, tên, SĐT, ngân hàng hoặc STK" disabled={Boolean(review)} />
        <FilterField label="Trạng thái" htmlFor="withdrawal-status">
        <Select id="withdrawal-status" aria-label="Lọc trạng thái rút tiền" value={status} options={statuses} style={{ minWidth: 190 }} disabled={Boolean(review)} onChange={value => filters.update({ status: value })} />
        </FilterField>
        <Button disabled={Boolean(review)} onClick={filters.reset}>Xóa bộ lọc</Button>
      </div>
      {search.error && <Alert type="warning" showIcon title={search.error} />}
      <QueryError error={query.error} retry={() => void query.refetch()} />
      <UpdatedAt value={query.dataUpdatedAt} fetching={query.isFetching} />
      <DataTable data={search.error ? undefined : query.data} columns={columns} mobileColumns={columns} loading={!search.error && query.isPending} scroll={1120} onPage={(page, size) => { if (!review) filters.update({ page, size }, false); }} />
    </Panel>
    {review && <WithdrawalReviewDialog target={review} query={query} onClose={() => setReview(null)} />}
  </>;
}
