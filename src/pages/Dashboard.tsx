import { useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Alert, Button, Card, Typography } from "antd";
import {
  ArrowRightOutlined,
  CarOutlined,
  FileProtectOutlined,
  FlagOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { api } from "../lib/api";
import { activeStatuses, date, label } from "../lib/format";
import { Heading, Panel, QueryError, Refresh, UpdatedAt, Loading } from "../components/common";
import { RideTable } from "../components/RideTable";
import { DashboardFinance } from "./DashboardFinance";
import { DashboardAnomalies, WithdrawalQueue } from "./DashboardActions";
import type { DashboardPeriod } from "../types";
import "./dashboard.css";

const financeKey = ["admin", "dashboard", "finance"];

export default function Dashboard() {
  const [period, setPeriod] = useState<DashboardPeriod>(7);
  const [withdrawalPage, setWithdrawalPage] = useState(0);
  const finance = useQuery({
    queryKey: [...financeKey, period],
    queryFn: () => api.dashboard(period),
    refetchInterval: 30_000,
  });
  const withdrawals = useQuery({
    queryKey: ["admin", "withdrawals", "dashboard", withdrawalPage],
    queryFn: () => api.withdrawals({ status: "PENDING", page: withdrawalPage, size: 5 }),
    refetchInterval: 30_000,
  });
  const [active, noDriver, documents, flagged, recent, pendingAccounts] = useQueries({
    queries: [
      {
        queryKey: ["admin", "dashboard", "active"],
        queryFn: () => api.rides({ status: activeStatuses, size: 1 }),
        refetchInterval: 30_000,
      },
      {
        queryKey: ["admin", "dashboard", "no-driver"],
        queryFn: () => api.rides({ status: "NO_DRIVER_FOUND", size: 1 }),
        refetchInterval: 30_000,
      },
      {
        queryKey: ["admin", "dashboard", "documents"],
        queryFn: () => api.documents({ status: "PENDING", size: 5 }),
        refetchInterval: 30_000,
      },
      {
        queryKey: ["admin", "dashboard", "flagged"],
        queryFn: () => api.customers({ flagged: true, size: 1 }),
        refetchInterval: 30_000,
      },
      {
        queryKey: ["admin", "dashboard", "recent"],
        queryFn: () => api.rides({ size: 5 }),
        refetchInterval: 30_000,
      },
      {
        queryKey: ["admin", "dashboard", "pending-accounts"],
        queryFn: () => api.drivers({ verification_status: "PENDING", size: 1 }),
        refetchInterval: 30_000,
      },
    ],
  });
  const stats = [
    {
      title: "Chuyến đang hoạt động",
      query: active,
      href: `/rides?status=${activeStatuses}`,
      icon: <CarOutlined />,
    },
    {
      title: "Chưa tìm được tài xế",
      query: noDriver,
      href: "/rides?status=NO_DRIVER_FOUND",
      icon: <SearchOutlined />,
    },
    {
      title: "Giấy tờ chờ duyệt",
      query: documents,
      href: "/driver-documents?status=PENDING",
      icon: <FileProtectOutlined />,
    },
    {
      title: "Khách hàng bị đánh dấu",
      query: flagged,
      href: "/customers?flagged=true",
      icon: <FlagOutlined />,
    },
  ];
  const all = [finance, withdrawals, active, noDriver, documents, flagged, recent, pendingAccounts];
  const updatedAt = Math.max(...all.map(query => query.dataUpdatedAt));
  return (
    <>
      <Heading
        title="Tổng quan vận hành"
        subtitle="Tài chính và vận hành PTITgo · Tự cập nhật mỗi 30 giây"
        actions={
          <Refresh
            loading={all.some((q) => q.isFetching)}
            onClick={() => all.forEach((q) => void q.refetch())}
          />
        }
      />
      <UpdatedAt value={updatedAt} fetching={all.some(query => query.isFetching)} />
      <DashboardFinance query={finance} period={period} onPeriodChange={setPeriod} />
      <div className="dashboard-section-heading">
        <h3>Theo dõi vận hành</h3>
      </div>
      <div className="stat-grid">
        {stats.map(({ title, query, href, icon }) => (
          <Link key={title} to={href}>
            <Card className="stat-card">
              <div className="stat-top">
                <span>{title}</span>
                <span className="stat-icon">{icon}</span>
              </div>
              <div className="stat-value">
                {query.isError || !query.data
                  ? "—"
                  : query.data.totalElements.toLocaleString("vi-VN")}
              </div>
              <div className="stat-bottom">
                {query.isError ? "Không tải được số liệu" : "Xem danh sách"}
                <ArrowRightOutlined />
              </div>
            </Card>
          </Link>
        ))}
      </div>
      {stats.some((s) => s.query.isError) && (
        <Alert
          type="warning"
          showIcon
          title="Một số số liệu chưa tải được. Nhấn Làm mới để thử lại."
          className="query-error"
        />
      )}
      <Panel
        title="Chuyến đi mới nhất"
        extra={
          <Link to="/rides">
            Tất cả chuyến <ArrowRightOutlined />
          </Link>
        }
      >
        <QueryError error={recent.error} retry={() => void recent.refetch()} />
        <RideTable
          data={recent.isError ? undefined : recent.data}
          loading={recent.isPending}
        />
      </Panel>
      <Panel
        title="Giấy tờ đang chờ duyệt"
        extra={
          <Link to="/driver-documents">
            Mở hàng chờ <ArrowRightOutlined />
          </Link>
        }
      >
        <Typography.Paragraph type="secondary" className="queue-summary">
          {documents.data && !documents.isError ? `${documents.data.totalElements} giấy tờ chờ duyệt` : "Chưa tải được số giấy tờ"}
          {" · "}<Link to="/drivers?verification_status=PENDING">
            {pendingAccounts.data && !pendingAccounts.isError ? `${pendingAccounts.data.totalElements} tài khoản tài xế chờ quyết định` : "Xem tài khoản chờ quyết định"}
          </Link>
        </Typography.Paragraph>
        <QueryError error={pendingAccounts.error} retry={() => void pendingAccounts.refetch()} />
        <QueryError
          error={documents.error}
          retry={() => void documents.refetch()}
        />
        {documents.isPending && <Loading />}
        {documents.data?.content.map((row) => (
          <div className="queue-row" key={row.document.id}>
            <div>
              <Link to={`/drivers/${row.document.driverId}`} state={{ from: "/dashboard" }}>
                {row.driverName || `Tài xế #${row.document.driverId}`}
              </Link>
              <Typography.Text type="secondary">
                {label(row.document.documentType)} ·{" "}
                {date(row.document.createdAt)}
              </Typography.Text>
            </div>
            <Link to={`/driver-documents?status=PENDING&driverId=${row.document.driverId}`}>
              <Button size="small">Xem hồ sơ</Button>
            </Link>
          </div>
        ))}
        {documents.data?.content.length === 0 && (
          <Typography.Text type="secondary">
            Không có giấy tờ đang chờ duyệt.
          </Typography.Text>
        )}
      </Panel>
      <div className="dashboard-section-heading">
        <div>
          <h3>Cần xử lý</h3>
          <p>Yêu cầu rút tiền và các chuyến cần kiểm tra.</p>
        </div>
      </div>
      <div className="dashboard-action-grid">
        <WithdrawalQueue
          query={withdrawals}
          page={withdrawalPage}
          onPageChange={setWithdrawalPage}
        />
        <DashboardAnomalies query={finance} />
      </div>
    </>
  );
}
