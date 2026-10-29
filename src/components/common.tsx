import type { ReactNode } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Image,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { errorMessage } from "../lib/api";
import { label, safeImage } from "../lib/format";
import type { Page } from "../types";

export function Heading({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <Typography.Title level={2}>{title}</Typography.Title>
        {subtitle && (
          <Typography.Text type="secondary">{subtitle}</Typography.Text>
        )}
      </div>
      <Space wrap>{actions}</Space>
    </div>
  );
}
export function Refresh({
  loading,
  onClick,
}: {
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      aria-label="Làm mới"
      icon={<ReloadOutlined aria-hidden />}
      loading={loading}
      onClick={onClick}
    >
      Làm mới
    </Button>
  );
}
export function QueryError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return error ? (
    <Alert
      className="query-error"
      type="error"
      showIcon
      title={errorMessage(error)}
      action={
        <Button size="small" onClick={retry}>
          Thử lại
        </Button>
      }
    />
  ) : null;
}
export function Loading() {
  return (
    <div className="loading">
      <Spin description="Đang tải dữ liệu…">
        <div />
      </Spin>
    </div>
  );
}
export function Status({ value }: { value: string | null | undefined }) {
  const color = ["APPROVED", "ACTIVE", "COMPLETED", "ONLINE", "PAID"].includes(
    value ?? "",
  )
    ? "green"
    : ["REJECTED", "BANNED", "CANCELLED", "EXPIRED"].includes(value ?? "")
      ? "red"
      : ["PENDING", "SEARCHING", "NO_DRIVER_FOUND", "BUSY"].includes(
            value ?? "",
          )
        ? "gold"
        : "default";
  return <Tag color={color}>{label(value)}</Tag>;
}
export function Photo({
  url,
  alt,
}: {
  url: string | null | undefined;
  alt: string;
}) {
  const src = safeImage(url);
  return src ? (
    <Image
      width={88}
      height={70}
      style={{ objectFit: "cover", borderRadius: 4 }}
      src={src}
      alt={alt}
      fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='88' height='70'%3E%3Crect width='100%25' height='100%25' fill='%23eeeeee'/%3E%3Ctext x='44' y='40' text-anchor='middle' font-size='10'%3ELỗi ảnh%3C/text%3E%3C/svg%3E"
    />
  ) : (
    <Typography.Text type="secondary">Không có ảnh</Typography.Text>
  );
}
export function DataTable<T extends { id: number }>({
  data,
  columns,
  loading,
  onPage,
  scroll = 850,
}: {
  data?: Page<T>;
  columns: ColumnsType<T>;
  loading?: boolean;
  onPage?: (page: number, size: number) => void;
  scroll?: number;
}) {
  return (
    <Table<T>
      rowKey="id"
      columns={columns}
      dataSource={data?.content ?? []}
      loading={loading}
      scroll={{ x: scroll }}
      locale={{
        emptyText: (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Không có dữ liệu phù hợp"
          />
        ),
      }}
      pagination={
        onPage
          ? {
              current: (data?.page ?? 0) + 1,
              pageSize: data?.size ?? 20,
              total: data?.totalElements ?? 0,
              showSizeChanger: true,
              pageSizeOptions: [20, 50, 100],
              showTotal: (total) => `${total} kết quả`,
              onChange: (page, size) => onPage(page - 1, size),
            }
          : false
      }
    />
  );
}
export function Panel({
  title,
  children,
  extra,
}: {
  title?: string;
  children: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <Card title={title} extra={extra} className="panel">
      {children}
    </Card>
  );
}
export function InvalidRecord() {
  return <Alert type="error" showIcon title="Mã bản ghi không hợp lệ." />;
}
