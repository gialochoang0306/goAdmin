import { useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Alert, Card, Empty, Typography } from "antd";
import {
  ArrowRightOutlined,
  CarOutlined,
  FileProtectOutlined,
  FlagOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { api, verificationFetch } from "../lib/api";
import { activeStatuses, date } from "../lib/format";
import { Heading, Panel, QueryError, Refresh, UpdatedAt, Loading } from "../components/common";
import { RideTable } from "../components/RideTable";
import { DashboardFinance } from "./DashboardFinance";
import { DashboardAnomalies, WithdrawalQueue } from "./DashboardActions";
import type { DashboardPeriod } from "../types";
import { verificationApplicationPath, verificationReviewPath, verificationQueueKey, states, type QueueResponse } from "./verificationReviewModel";
import "./dashboard.css";

const financeKey = ["admin", "dashboard", "finance"];
const pendingVerificationPath = verificationReviewPath + "?status=PENDING_REVIEW";

export default function Dashboard() {
  const [period, setPeriod] = useState<DashboardPeriod>(7);
  const [withdrawalPage, setWithdrawalPage] = useState(0);
  const finance = useQuery({
    queryKey: [...financeKey, period],
    queryFn: () => api.dashboard(period),
    refetchInterval: 30_000,
  });
  const promoBudget = useQuery({
    queryKey: ["admin", "dashboard", "promo-budget"],
    queryFn: () => api.promoBudget(),
    refetchInterval: 30_000,
  });
  const withdrawals = useQuery({
    queryKey: ["admin", "withdrawals", "dashboard", withdrawalPage],
    queryFn: () => api.withdrawals({ status: "PENDING", page: withdrawalPage, size: 5 }),
    refetchInterval: 30_000,
  });
  const [active, noDriver, flagged, recent] = useQueries({
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
        queryKey: ["admin", "dashboard", "flagged"],
        queryFn: () => api.customers({ flagged: true, size: 1 }),
        refetchInterval: 30_000,
      },
      {
        queryKey: ["admin", "dashboard", "recent"],
        queryFn: () => api.rides({ size: 5 }),
        refetchInterval: 30_000,
      },
    ],
  });
  const verification = useQuery({
    queryKey: [...verificationQueueKey, "dashboard"],
    queryFn: ({ signal }) => verificationFetch<QueueResponse>("review-queue?status=PENDING_REVIEW&limit=5", { signal }),
    refetchInterval: 30_000,
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
      title: "Hồ sơ tài xế chờ duyệt",
      query: verification,
      href: pendingVerificationPath,
      icon: <FileProtectOutlined />,
    },
    {
      title: "Khách hàng bị đánh dấu",
      query: flagged,
      href: "/customers?flagged=true",
      icon: <FlagOutlined />,
    },
  ];
  const all = [finance, promoBudget, withdrawals, active, noDriver, flagged, recent, verification];
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
      <DashboardFinance query={finance} promoBudget={promoBudget.data} period={period} onPeriodChange={setPeriod} />
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
        title="Hồ sơ tài xế chờ duyệt"
        extra={<Link to={pendingVerificationPath}>Mở hàng chờ <ArrowRightOutlined /></Link>}
      >
        <QueryError error={verification.error} retry={() => void verification.refetch()} />
        {verification.isPending && <Loading />}
        {verification.data?.items.map((application) => (
          <div className="queue-row" key={application.id}>
            <div>
              <Link to={verificationApplicationPath(application.id)}>
                {application.driverName || (application.driverId ? "Tài xế #" + application.driverId : "Hồ sơ " + application.id)}
              </Link>
              <Typography.Text type="secondary">
                {states[application.status]} · {date(application.submittedAt)}
              </Typography.Text>
            </div>
            <Link to={verificationApplicationPath(application.id)}>Xem hồ sơ</Link>
          </div>
        ))}
        {verification.data?.items.length === 0 && (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có hồ sơ đang chờ duyệt." />
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