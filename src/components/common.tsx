import type { ReactNode } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Image,
  Grid,
  Pagination,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import type { ColumnsType, ColumnType } from "antd/es/table";
import { errorMessage } from "../lib/api";
import { date, label, safeImage } from "../lib/format";
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
  retryLabel = "Thử lại",
}: {
  error: unknown;
  retry: () => void;
  retryLabel?: string;
}) {
  return error ? (
    <Alert
      className="query-error"
      type="error"
      showIcon
      title={errorMessage(error)}
      action={
        <Button size="small" onClick={retry}>
          {retryLabel}
        </Button>
      }
    />
  ) : null;
}
export function UpdatedAt({ value, fetching }: { value: number; fetching?: boolean }) {
  return <div className="last-updated" role="status">{fetching ? "Đang cập nhật dữ liệu…" : value ? `Cập nhật gần nhất: ${date(new Date(value).toISOString())}` : "Chưa có lần cập nhật thành công"}</div>;
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
  mobileColumns,
  onReset,
}: {
  data?: Page<T>;
  columns: ColumnsType<T>;
  loading?: boolean;
  onPage?: (page: number, size: number) => void;
  scroll?: number;
  mobileColumns?: ColumnsType<T>;
  onReset?: () => void;
}) {
  const screens = Grid.useBreakpoint();
  const pagination = onPage ? {
    current: (data?.page ?? 0) + 1, pageSize: data?.size ?? 20,
    total: data?.totalElements ?? 0, showSizeChanger: true,
    pageSizeOptions: [20, 50, 100], showTotal: (total: number) => `${total} kết quả`,
    onChange: (page: number, size: number) => onPage(page - 1, size),
  } : false;
  const empty = <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={loading && !data ? "Đang tải dữ liệu…" : data ? "Không có dữ liệu phù hợp" : "Chưa tải được dữ liệu"}>
    {onReset && data && <Button onClick={onReset}>Xóa bộ lọc</Button>}
  </Empty>;
  if (screens.xs) {
    const summary = mobileColumns ?? [...columns.slice(0, 3), ...columns.slice(3).filter(column => column.title === "Thao tác")];
    const fields = summary.filter((column): column is ColumnType<T> => !("children" in column));
    return <Spin spinning={!!loading}>
      <div className="table-mobile-list" aria-busy={!!loading}>
        {data?.content.length ? data.content.map((record, index) => <article key={record.id} className="table-mobile-card" aria-label={`Bản ghi #${record.id}`}>
          <dl>{fields.map((column, i) => {
            const keys = column.dataIndex == null ? [] : Array.isArray(column.dataIndex) ? column.dataIndex : [column.dataIndex];
            const value = keys.reduce<unknown>((current, key) => current && typeof current === "object" ? Reflect.get(current, String(key)) : undefined, record);
            return <div className="table-mobile-field" key={String(column.key ?? i)}>
              <dt>{column.title as ReactNode}</dt><dd>{column.render ? column.render(value, record, index) as ReactNode : value as ReactNode}</dd>
            </div>;
          })}</dl>
        </article>) : empty}
        {pagination && <Pagination {...pagination} className="table-mobile-pagination" simple showSizeChanger={false} />}
      </div>
    </Spin>;
  }
  return (
    <Table<T>
      aria-busy={!!loading}
      rowKey="id"
      columns={columns}
      dataSource={data?.content ?? []}
      loading={loading}
      scroll={{ x: scroll }}
      locale={{
        emptyText: empty,
      }}
      pagination={pagination}
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
