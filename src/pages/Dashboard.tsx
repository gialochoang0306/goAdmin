import { useQueries } from "@tanstack/react-query";
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
import { Heading, Panel, QueryError, Refresh } from "../components/common";
import { RideTable } from "../components/RideTable";

export default function Dashboard() {
  const [active, noDriver, documents, flagged, recent] = useQueries({
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
  const all = [active, noDriver, documents, flagged, recent];
  return (
    <>
      <Heading
        title="Tổng quan vận hành"
        subtitle="Dữ liệu toàn hệ thống · Tự cập nhật mỗi 30 giây"
        actions={
          <Refresh
            loading={all.some((q) => q.isFetching)}
            onClick={() => all.forEach((q) => void q.refetch())}
          />
        }
      />
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
        <QueryError
          error={documents.error}
          retry={() => void documents.refetch()}
        />
        {documents.data?.content.map((row) => (
          <div className="queue-row" key={row.document.id}>
            <div>
              <Link to={`/drivers/${row.document.driverId}`}>
                {row.driverName || `Tài xế #${row.document.driverId}`}
              </Link>
              <Typography.Text type="secondary">
                {label(row.document.documentType)} ·{" "}
                {date(row.document.createdAt)}
              </Typography.Text>
            </div>
            <Link to="/driver-documents">
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
    </>
  );
}
