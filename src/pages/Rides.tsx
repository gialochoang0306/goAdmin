import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  App,
  Button,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Timeline,
  Typography,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { api, errorMessage, mapConcurrent } from "../lib/api";
import {
  activeStatuses,
  assignableStatuses,
  cancellableStatuses,
  date,
  label,
  money,
  rideLabels,
  text,
} from "../lib/format";
import { useAction, useFilters } from "../lib/hooks";
import {
  Heading,
  InvalidRecord,
  Loading,
  Panel,
  Photo,
  QueryError,
  Refresh,
  Status,
} from "../components/common";
import { RideTable } from "../components/RideTable";
import type { ChatMessage, Driver, MessagePage, RideDetail } from "../types";

export function Rides() {
  const f = useFilters();
  const location = useLocation();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const status = f.read("status");
  const query = useQuery({
    queryKey: ["admin", "rides", f.page, f.size, status],
    queryFn: () => api.rides({ ...f.params, status }),
    refetchInterval: 30_000,
  });
  return (
    <>
      <Heading
        title="Quản lý chuyến đi"
        subtitle="Theo dõi và xử lý các chuyến trong hệ thống."
        actions={
          <Refresh
            loading={query.isFetching}
            onClick={() => void query.refetch()}
          />
        }
      />
      <div className="filters">
        <Select
          aria-label="Trạng thái chuyến"
          placeholder="Tất cả trạng thái"
          mode="multiple"
          style={{ minWidth: 260, maxWidth: 580 }}
          maxTagCount="responsive"
          allowClear
          value={status ? status.split(",") : []}
          options={Object.entries(rideLabels).map(([value, label]) => ({
            value,
            label,
          }))}
          onChange={(values) => f.update({ status: values.join(",") })}
        />
        <Button onClick={() => f.update({ status: activeStatuses })}>
          Đang hoạt động
        </Button>
        <Input.Search
          aria-label="Mã chuyến"
          placeholder="Mở chuyến theo mã"
          enterButton="Mở"
          onSearch={(value) => {
            if (
              /^[1-9]\d*$/.test(value.trim()) &&
              Number.isSafeInteger(Number(value))
            )
              navigate(`/rides/${value.trim()}`, {
                state: { from: `/rides${location.search}` },
              });
            else
              void message.warning(
                "Nhập mã chuyến là một số nguyên lớn hơn 0.",
              );
          }}
        />
      </div>
      <QueryError error={query.error} retry={() => void query.refetch()} />
      <Panel>
        <RideTable
          data={query.data}
          loading={query.isPending}
          onPage={(page, size) => f.update({ page, size }, false)}
        />
      </Panel>
    </>
  );
}

function mergeMessages(messages: ChatMessage[]) {
  return [...new Map(messages.map((m) => [m.id, m])).values()].sort(
    (a, b) => a.id - b.id,
  );
}
function RideChat({ id }: { id: number }) {
  const client = useQueryClient();
  const list = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const key = ["admin", "chat", id];
  const chat = useQuery({
    queryKey: key,
    queryFn: async () => {
      const previous = client.getQueryData<MessagePage>(["admin", "chat", id]);
      let afterId = previous?.messages.at(-1)?.id;
      let collected: ChatMessage[] = [];
      let result: MessagePage;
      do {
        result = await api.chat(id, afterId ? { afterId } : {});
        collected = [...collected, ...result.messages];
        const next = Math.max(...result.messages.map((m) => m.id));
        if (
          !afterId ||
          !result.hasMore ||
          !Number.isFinite(next) ||
          next <= afterId
        )
          break;
        afterId = next;
      } while (result.hasMore);
      const latest = client.getQueryData<MessagePage>(["admin", "chat", id]);
      return {
        rideId: id,
        messages: mergeMessages([...(latest?.messages ?? []), ...collected]),
        hasMore: previous?.messages.length
          ? (latest?.hasMore ?? false)
          : result.hasMore,
      };
    },
    refetchInterval: 10_000,
  });
  useEffect(() => {
    if (atBottom.current && list.current)
      list.current.scrollTop = list.current.scrollHeight;
  }, [chat.data]);
  const older = useMutation({
    mutationFn: () => api.chat(id, { beforeId: chat.data?.messages[0]?.id }),
    onSuccess: (page) => {
      const node = list.current;
      const height = node?.scrollHeight ?? 0;
      const top = node?.scrollTop ?? 0;
      atBottom.current = false;
      client.setQueryData<MessagePage>(key, (old) => ({
        ...page,
        messages: mergeMessages([...page.messages, ...(old?.messages ?? [])]),
      }));
      requestAnimationFrame(() => {
        if (node) node.scrollTop = top + node.scrollHeight - height;
      });
    },
    retry: false,
  });
  return (
    <Panel
      title="Lịch sử hội thoại"
      extra={
        <Refresh
          loading={chat.isFetching}
          onClick={() => void chat.refetch()}
        />
      }
    >
      <Typography.Paragraph type="secondary">
        Chỉ xem hội thoại của khách và tài xế · Cập nhật mỗi 10 giây.
      </Typography.Paragraph>
      <QueryError
        error={chat.error || older.error}
        retry={() => {
          if (older.error) older.mutate();
          else void chat.refetch();
        }}
      />
      {chat.data?.hasMore && (
        <Button loading={older.isPending} onClick={() => older.mutate()}>
          Tải tin nhắn cũ
        </Button>
      )}
      {chat.isPending ? (
        <Loading />
      ) : chat.data?.messages.length ? (
        <div
          className="chat-list"
          ref={list}
          onScroll={() => {
            const node = list.current;
            if (node)
              atBottom.current =
                node.scrollHeight - node.scrollTop - node.clientHeight < 50;
          }}
        >
          {chat.data.messages.map((m) => (
            <article
              className={`chat-message ${m.senderRole === "DRIVER" ? "driver" : ""}`}
              key={m.id}
            >
              <div className="chat-meta">
                <span>{label(m.senderRole)}</span>
                <time>{date(m.createdAt)}</time>
              </div>
              {m.content && <div>{m.content}</div>}
              {m.attachmentUrl && (
                <Photo
                  url={m.attachmentUrl}
                  alt={`Ảnh trong tin nhắn ${m.id}`}
                />
              )}
            </article>
          ))}
        </div>
      ) : (
        <Empty
          description="Chưa có hội thoại"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}
    </Panel>
  );
}

type Candidate = {
  id: number;
  distanceKm?: number;
  driver?: Driver;
  failure?: string;
};
function AssignDriver({
  ride,
  onClose,
}: {
  ride: RideDetail;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const hasLocation =
    Number.isFinite(ride.pickup.lat) &&
    Number.isFinite(ride.pickup.lng) &&
    ride.pickup.lat !== null &&
    ride.pickup.lng !== null;
  const [mode, setMode] = useState(hasLocation ? "nearby" : "search");
  const [radius, setRadius] = useState(5);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<number>();
  const candidates = useQuery({
    queryKey: ["admin", "candidates", ride.id, mode, radius, search, page],
    queryFn: async (): Promise<{ rows: Candidate[]; total: number }> => {
      if (mode === "search") {
        const results = await api.drivers({
          search,
          online: true,
          verification_status: "APPROVED",
          flagged: false,
          page,
          size: 20,
        });
        return {
          rows: results.content.map((driver) => ({ id: driver.id, driver })),
          total: results.totalElements,
        };
      }
      const nearby = (
        await api.nearby(ride.pickup.lng!, ride.pickup.lat!, radius)
      ).slice(0, 20);
      const rows = await mapConcurrent(nearby, async (entry) => {
        try {
          const detail = await client.fetchQuery({
            queryKey: ["admin", "driver", entry.driverId],
            queryFn: () => api.driver(entry.driverId),
            staleTime: 15_000,
          });
          return {
            id: entry.driverId,
            distanceKm: entry.distanceKm,
            driver: detail.driver,
          };
        } catch (e) {
          return {
            id: entry.driverId,
            distanceKm: entry.distanceKm,
            failure: errorMessage(e),
          };
        }
      });
      return { rows, total: rows.length };
    },
  });
  const assignment = useAction(
    (driverId: number) => api.assign(ride.id, driverId),
    onClose,
  );
  const selectedRow = candidates.data?.rows.find((row) => row.id === selected);
  const unavailable = (row: Candidate) =>
    !row.driver ||
    row.driver.status !== "ONLINE" ||
    row.driver.verificationStatus !== "APPROVED" ||
    row.driver.flagged ||
    row.id === ride.driverId;
  return (
    <Modal
      open
      title={`Gán tài xế · Chuyến #${ride.id}`}
      width={800}
      onCancel={() => {
        if (!assignment.isPending) onClose();
      }}
      mask={{ closable: !assignment.isPending }}
      footer={
        <Space>
          <Button disabled={assignment.isPending} onClick={onClose}>
            Đóng
          </Button>
          <Button
            type="primary"
            loading={assignment.isPending}
            disabled={
              !selectedRow || unavailable(selectedRow) || candidates.isFetching
            }
            onClick={() => {
              if (selected)
                assignment.mutate(selected, {
                  onError: () => {
                    void client.invalidateQueries({
                      queryKey: ["admin", "ride", ride.id],
                    });
                    void candidates.refetch();
                  },
                });
            }}
          >
            Xác nhận gán
          </Button>
        </Space>
      }
    >
      <Alert
        type="info"
        showIcon
        className="toolbar-note"
        title={
          ride.status === "NO_DRIVER_FOUND"
            ? "Hệ thống kiểm tra điều kiện nhận chuyến khi xác nhận."
            : "Chỉ có thể gán lại khi tài xế hiện tại mất liên lạc. Hệ thống sẽ kiểm tra khi xác nhận."
        }
      />
      {!hasLocation && (
        <Alert
          type="warning"
          title="Chuyến chưa có tọa độ điểm đón. Hãy tìm theo tên hoặc số điện thoại."
          className="toolbar-note"
        />
      )}
      <Tabs
        activeKey={mode}
        onChange={(value) => {
          setMode(value);
          setSelected(undefined);
          setPage(0);
        }}
        items={[
          { key: "nearby", label: "Gần điểm đón", disabled: !hasLocation },
          { key: "search", label: "Tìm tài xế" },
        ]}
      />
      <div className="filters">
        {mode === "nearby" ? (
          <>
            <span>Bán kính (km)</span>
            <InputNumber
              aria-label="Bán kính (km)"
              min={0.1}
              precision={1}
              value={radius}
              onChange={(v) => {
                if (v && v > 0) {
                  setRadius(v);
                  setSelected(undefined);
                }
              }}
            />
          </>
        ) : (
          <Input.Search
            aria-label="Tìm tài xế"
            placeholder="Tên hoặc số điện thoại"
            onSearch={(value) => {
              setSearch(value.trim());
              setPage(0);
              setSelected(undefined);
            }}
            enterButton="Tìm"
          />
        )}
        <Refresh
          loading={candidates.isFetching}
          onClick={() => void candidates.refetch()}
        />
      </div>
      <QueryError
        error={candidates.error || assignment.error}
        retry={() => void candidates.refetch()}
      />
      <Table<Candidate>
        size="small"
        rowKey="id"
        loading={candidates.isPending}
        scroll={{ x: 550 }}
        dataSource={candidates.data?.rows ?? []}
        rowSelection={{
          type: "radio",
          selectedRowKeys: selected ? [selected] : [],
          onChange: (keys) => setSelected(Number(keys[0])),
          getCheckboxProps: (row) => ({
            disabled: unavailable(row),
            "aria-label": `Chọn tài xế ${row.id}`,
          }),
        }}
        columns={[
          {
            title: "Tài xế",
            render: (_, row) => (
              <>
                <div>{row.driver?.fullName || `Tài xế #${row.id}`}</div>
                <div className="muted">
                  {row.driver?.phoneNumber || row.failure}
                </div>
              </>
            ),
          },
          {
            title: "Khoảng cách",
            dataIndex: "distanceKm",
            render: (v) => (v == null ? "—" : `${Number(v).toFixed(2)} km`),
          },
          {
            title: "Trạng thái",
            render: (_, row) =>
              row.driver ? (
                <Status value={row.driver.status} />
              ) : (
                "Không tải được hồ sơ"
              ),
          },
        ]}
        pagination={
          mode === "search"
            ? {
                current: page + 1,
                pageSize: 20,
                total: candidates.data?.total,
                showSizeChanger: false,
                onChange: (p) => {
                  setPage(p - 1);
                  setSelected(undefined);
                },
              }
            : false
        }
        locale={{
          emptyText:
            "Không có tài xế phù hợp. Thử bán kính khác hoặc tìm theo tên/SĐT.",
        }}
      />
      <p className="muted">
        Danh sách gần điểm đón tối đa 20 tài xế. Trạng thái và điều kiện nhận
        chuyến có thể thay đổi.
      </p>
    </Modal>
  );
}

export function RideDetailPage() {
  const id = Number(useParams().id);
  const valid = Number.isSafeInteger(id) && id > 0;
  const location = useLocation();
  const f = useFilters();
  const [assign, setAssign] = useState(false);
  const [cancel, setCancel] = useState(false);
  const [form] = Form.useForm<{ reason: string }>();
  const query = useQuery({
    queryKey: ["admin", "ride", id],
    queryFn: () => api.ride(id),
    enabled: valid,
    refetchInterval: 30_000,
  });
  const ride = query.data;
  const customer = useQuery({
    queryKey: ["admin", "customer", ride?.customerId],
    queryFn: () => api.customer(ride!.customerId),
    enabled: !!ride?.customerId,
  });
  const driver = useQuery({
    queryKey: ["admin", "driver", ride?.driverId],
    queryFn: () => api.driver(ride!.driverId!),
    enabled: !!ride?.driverId,
  });
  const cancellation = useAction(
    ({ reason }: { reason: string }) => api.cancel(id, reason.trim()),
    () => setCancel(false),
  );
  if (!valid) return <InvalidRecord />;
  if (query.isPending) return <Loading />;
  if (!ride)
    return (
      <QueryError error={query.error} retry={() => void query.refetch()} />
    );
  const vehicle = customer.data?.vehicles.find((v) => v.id === ride.vehicleId);
  return (
    <>
      <Link className="back-link" to={location.state?.from || "/rides"}>
        <ArrowLeftOutlined /> Quay lại danh sách
      </Link>
      <Heading
        title={`Chuyến đi #${id}`}
        actions={
          <>
            <Status value={ride.status} />
            <Refresh
              loading={query.isFetching}
              onClick={() => void query.refetch()}
            />
            {assignableStatuses.has(ride.status) && (
              <Button type="primary" onClick={() => setAssign(true)}>
                {ride.driverId ? "Gán lại tài xế" : "Gán tài xế"}
              </Button>
            )}
            {cancellableStatuses.has(ride.status) && (
              <Button
                danger
                onClick={() => {
                  form.resetFields();
                  cancellation.reset();
                  setCancel(true);
                }}
              >
                Hủy chuyến
              </Button>
            )}
          </>
        }
      />
      <QueryError error={query.error} retry={() => void query.refetch()} />
      <Tabs
        activeKey={
          ["overview", "handover", "chat"].includes(f.read("tab", "overview"))
            ? f.read("tab", "overview")
            : "overview"
        }
        onChange={(tab) => f.update({ tab }, false)}
        destroyOnHidden
        items={[
          {
            key: "overview",
            label: "Thông tin chuyến",
            children: (
              <>
                <div className="detail-grid">
                  <Panel title="Lộ trình và chi phí">
                    <Descriptions
                      column={1}
                      items={[
                        {
                          key: "pickup",
                          label: "Điểm đón",
                          children: text(ride.pickupAddress),
                        },
                        {
                          key: "dropoff",
                          label: "Điểm trả",
                          children: text(ride.dropoffAddress),
                        },
                        {
                          key: "type",
                          label: "Loại chuyến",
                          children: label(ride.type),
                        },
                        {
                          key: "scheduled",
                          label: "Hẹn đón",
                          children: date(ride.scheduledAt),
                        },
                        {
                          key: "distance",
                          label: "Quãng đường",
                          children:
                            ride.distanceKm == null
                              ? "—"
                              : `${ride.distanceKm} km`,
                        },
                        {
                          key: "estimate",
                          label: "Giá dự kiến",
                          children: money(ride.estimatedFare),
                        },
                        {
                          key: "final",
                          label: "Giá thực tế",
                          children: money(ride.finalFare),
                        },
                        {
                          key: "discount",
                          label: "Giảm giá",
                          children: money(ride.discountAmount),
                        },
                        {
                          key: "created",
                          label: "Tạo lúc",
                          children: date(ride.createdAt),
                        },
                        {
                          key: "cancel",
                          label: "Lý do hủy",
                          children: text(ride.cancelReason),
                        },
                      ]}
                    />
                  </Panel>
                  <Panel title="Khách hàng và tài xế">
                    <Descriptions
                      column={1}
                      items={[
                        {
                          key: "customer",
                          label: "Khách hàng",
                          children: (
                            <Link to={`/customers/${ride.customerId}`}>
                              {customer.data?.fullName ||
                                `Khách #${ride.customerId}`}
                            </Link>
                          ),
                        },
                        {
                          key: "phone",
                          label: "SĐT khách",
                          children: text(customer.data?.phoneNumber),
                        },
                        {
                          key: "driver",
                          label: "Tài xế",
                          children: ride.driverId ? (
                            <Link to={`/drivers/${ride.driverId}`}>
                              {driver.data?.driver.fullName ||
                                `Tài xế #${ride.driverId}`}
                            </Link>
                          ) : (
                            "Chưa có tài xế"
                          ),
                        },
                        {
                          key: "driverPhone",
                          label: "SĐT tài xế",
                          children: text(driver.data?.driver.phoneNumber),
                        },
                        {
                          key: "vehicle",
                          label: "Xe",
                          children: vehicle
                            ? `${text(vehicle.plateNumber)} · ${label(vehicle.vehicleType)} · ${label(vehicle.transmissionType)}`
                            : `Xe #${ride.vehicleId}`,
                        },
                      ]}
                    />
                    {(customer.isError || driver.isError) && (
                      <Typography.Text type="secondary">
                        Một số hồ sơ không tải được. Thông tin chuyến vẫn được
                        giữ nguyên.
                      </Typography.Text>
                    )}
                  </Panel>
                </div>
                <Panel title="Lịch sử trạng thái">
                  <Timeline
                    items={ride.statusHistory.map((h) => ({
                      content: (
                        <>
                          <Space wrap>
                            <Status value={h.toStatus} />
                            <span className="muted">{date(h.createdAt)}</span>
                          </Space>
                          <p>
                            {h.note || "Thay đổi trạng thái"}
                            {h.actorRole ? ` · ${label(h.actorRole)}` : ""}
                            {h.actorId ? ` #${h.actorId}` : ""}
                          </p>
                        </>
                      ),
                    }))}
                  />
                </Panel>
              </>
            ),
          },
          {
            key: "handover",
            label: "Biên bản bàn giao",
            children: ride.handoverReports.length ? (
              ride.handoverReports.map((report) => (
                <Panel
                  key={report.id}
                  title={`${label(report.phase)} · ${date(report.createdAt)}`}
                >
                  <Descriptions
                    column={{ xs: 1, sm: 2 }}
                    items={[
                      {
                        key: "odometer",
                        label: "Số công tơ mét",
                        children: `${report.odometer} km`,
                      },
                      {
                        key: "fuel",
                        label: "Nhiên liệu",
                        children:
                          report.fuelLevel == null
                            ? "—"
                            : `${report.fuelLevel}%`,
                      },
                      {
                        key: "confirm",
                        label: "Khách xác nhận",
                        children: report.confirmedByCustomer
                          ? "Đã xác nhận"
                          : "Chưa xác nhận",
                      },
                      {
                        key: "notes",
                        label: "Ghi chú",
                        children: text(report.notes),
                      },
                    ]}
                  />
                  <div className="photo-grid">
                    {report.photos.map((photo) => (
                      <figure key={photo.id}>
                        <Photo url={photo.fileUrl} alt={label(photo.angle)} />
                        <figcaption>{label(photo.angle)}</figcaption>
                      </figure>
                    ))}
                  </div>
                </Panel>
              ))
            ) : (
              <Panel>
                <Empty description="Chưa có biên bản bàn giao" />
              </Panel>
            ),
          },
          { key: "chat", label: "Hội thoại", children: <RideChat id={id} /> },
        ]}
      />
      {assign && <AssignDriver ride={ride} onClose={() => setAssign(false)} />}
      <Modal
        title={`Hủy chuyến #${id}`}
        open={cancel}
        onCancel={() => {
          if (!cancellation.isPending) setCancel(false);
        }}
        onOk={() => form.submit()}
        okText="Xác nhận hủy"
        cancelText="Đóng"
        confirmLoading={cancellation.isPending}
        cancelButtonProps={{ disabled: cancellation.isPending }}
        okButtonProps={{
          danger: true,
          disabled: !cancellableStatuses.has(ride.status),
        }}
      >
        <QueryError
          error={cancellation.error}
          retry={() => cancellation.reset()}
        />
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            if (!cancellation.isPending) cancellation.mutate(values);
          }}
        >
          <Form.Item
            label="Lý do hủy"
            name="reason"
            rules={[
              {
                required: true,
                whitespace: true,
                message: "Nhập lý do hủy chuyến.",
              },
              { max: 255, message: "Lý do tối đa 255 ký tự." },
            ]}
          >
            <Input.TextArea rows={3} maxLength={255} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
