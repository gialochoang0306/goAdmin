import { Link, useLocation } from "react-router-dom";
import type { ColumnsType } from "antd/es/table";
import { DataTable, Status } from "./common";
import { date, label, money, text } from "../lib/format";
import type { Ride, Page } from "../types";

export function RideTable({
  data,
  loading,
  onPage,
}: {
  data?: Page<Ride>;
  loading?: boolean;
  onPage?: (page: number, size: number) => void;
}) {
  const location = useLocation();
  const columns: ColumnsType<Ride> = [
    {
      title: "Mã chuyến",
      dataIndex: "id",
      width: 95,
      render: (id) => (
        <Link
          to={`/rides/${id}`}
          state={{ from: location.pathname + location.search }}
        >
          #{id}
        </Link>
      ),
    },
    {
      title: "Lộ trình",
      key: "route",
      width: 280,
      render: (_, r) => (
        <div className="route-cell">
          <span>
            <i className="route-dot" />
            {text(r.pickupAddress)}
          </span>
          <span>
            <i className="route-dot end" />
            {text(r.dropoffAddress)}
          </span>
        </div>
      ),
    },
    { title: "Loại chuyến", dataIndex: "type", width: 110, render: label },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 170,
      render: (v) => <Status value={v} />,
    },
    {
      title: "Giá chuyến",
      key: "fare",
      width: 150,
      render: (_, r) => (
        <>
          <div>{money(r.finalFare ?? r.estimatedFare)}</div>
          <div className="muted">
            {r.finalFare == null
              ? "Dự kiến"
              : `Dự kiến: ${money(r.estimatedFare)}`}
          </div>
        </>
      ),
    },
    {
      title: "Thời gian tạo",
      key: "time",
      width: 165,
      render: (_, r) => (
        <>
          <div>{date(r.createdAt)}</div>
          {r.scheduledAt && (
            <div className="muted">Hẹn: {date(r.scheduledAt)}</div>
          )}
        </>
      ),
    },
  ];
  return (
    <DataTable
      data={data}
      columns={columns}
      loading={loading}
      onPage={onPage}
      scroll={970}
    />
  );
}
