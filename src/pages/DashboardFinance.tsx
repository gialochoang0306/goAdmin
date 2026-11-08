import { lazy, Suspense, type ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { Card, Empty, Segmented } from "antd";
import {
  BarChartOutlined, CarOutlined, CreditCardOutlined, DollarCircleOutlined,
  GiftOutlined, RiseOutlined, TeamOutlined, WalletOutlined,
} from "@ant-design/icons";
import { Loading, QueryError } from "../components/common";
import { date, money, percentage } from "../lib/format";
import type { DashboardPeriod, DashboardSummary } from "../types";

const count = new Intl.NumberFormat("vi-VN");
const DailyBars = lazy(() => import("./DashboardCharts").then(({ DailyBars }) => ({ default: DailyBars })));
const PaymentDonut = lazy(() => import("./DashboardCharts").then(({ PaymentDonut }) => ({ default: PaymentDonut })));

function Metric({ label, value, detail, icon, tone }: {
  label: string; value: string; detail: ReactNode; icon: ReactNode; tone?: string;
}) {
  return (
    <Card className="dashboard-metric" data-tone={tone}>
      <div className="dashboard-metric-header">
        <span>{label}</span>
        <span className="dashboard-metric-icon" aria-hidden>{icon}</span>
      </div>
      <div className="dashboard-metric-value">{value}</div>
      <div className="dashboard-metric-detail">{detail}</div>
    </Card>
  );
}

function FinanceCharts({ data, period, loading }: { data?: DashboardSummary; period: DashboardPeriod; loading: boolean }) {
  const payments = data ? [
    { name: "Tiền mặt", value: data.paymentMix.cash, fill: "var(--dashboard-blue-light)" },
    { name: "Ví ứng dụng", value: data.paymentMix.wallet, fill: "var(--dashboard-blue)" },
    { name: "Khác", value: data.paymentMix.other, fill: "var(--border-strong)" },
  ].filter((item) => item.name !== "Khác" || item.value > 0) : [];
  const paymentTotal = payments.reduce((total, item) => total + item.value, 0);
  const noData = <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={data ? "Chưa có chuyến hoàn thành trong kỳ." : "Chưa tải được số liệu."} />;

  return (
    <div className="dashboard-chart-grid">
      <Card className="dashboard-panel" title={<h3>GMV và doanh thu</h3>}>
        <div className="dashboard-chart-caption">
          <span>Theo ngày hoàn thành · VND</span>
          <div className="dashboard-chart-key">
            <span><i className="dashboard-key-gmv" /> GMV</span>
            <span><i className="dashboard-key-revenue" /> Doanh thu</span>
          </div>
        </div>
        <div className="dashboard-bar-chart">
          {loading ? <Loading /> : !data || !paymentTotal ? noData : (
            <Suspense fallback={<Loading />}>
              <DailyBars points={data.daily} />
            </Suspense>
          )}
        </div>
      </Card>
      <Card className="dashboard-panel" title={<h3>Cơ cấu thanh toán</h3>}>
        <div className="dashboard-chart-caption">Chuyến hoàn thành · {period} ngày</div>
        {loading ? <Loading /> : !paymentTotal ? noData : (
          <>
            <div className="dashboard-donut" aria-hidden>
              <Suspense fallback={null}>
                <PaymentDonut payments={payments.filter(({ value }) => value > 0)} />
              </Suspense>
              <div className="dashboard-donut-label"><strong>{count.format(paymentTotal)}</strong><span>chuyến</span></div>
            </div>
            <ul className="dashboard-payment-key">
              {payments.map(({ name, value, fill }) => (
                <li key={name}>
                  <span><i style={{ backgroundColor: fill }} /> {name}</span>
                  <span className="dashboard-payment-count">{count.format(value)} chuyến</span>
                  <strong>{percentage(value / paymentTotal)}</strong>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}

export function DashboardFinance({ query, period, onPeriodChange }: {
  query: UseQueryResult<DashboardSummary>;
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
}) {
  const data = query.data;
  const wallets = data?.wallets;
  const held = wallets ? wallets.driverCash + wallets.customer + wallets.driverCredit + wallets.pendingWithdrawals : null;
  const change = data && data.previousTripCount > 0 ? (data.tripCount - data.previousTripCount) / data.previousTripCount : null;
  const first = data?.daily.at(0)?.day;
  const last = data?.daily.at(-1)?.day;

  return (
    <>
      <section className="dashboard-section" aria-labelledby="dashboard-business" aria-busy={query.isPending}>
        <div className="dashboard-section-heading">
          <div>
            <h3 id="dashboard-business">Hiệu quả kinh doanh</h3>
            <p>{first && last ? `${date(first)} – ${date(last)} · Giờ Việt Nam` : "Thống kê theo giờ Việt Nam"}</p>
          </div>
          <Segmented<DashboardPeriod>
            aria-label="Khoảng thống kê"
            value={period}
            onChange={onPeriodChange}
            options={[{ label: "7 ngày", value: 7 }, { label: "30 ngày", value: 30 }]}
          />
        </div>
        <QueryError error={query.error} retry={() => void query.refetch()} />
        <div className="dashboard-kpi-grid">
          <Metric label="Tổng giá trị giao dịch (GMV)" value={money(data?.gmv)} detail="Cước chuyến hoàn thành trước voucher" icon={<BarChartOutlined />} />
          <Metric label="Doanh thu nền tảng" value={money(data?.revenue)} detail="Chiết khấu đã ghi sổ" icon={<DollarCircleOutlined />} tone="revenue" />
          <Metric label="Chi phí khuyến mãi" value={money(data?.promoCost)} detail="Giá trị voucher của chuyến hoàn thành" icon={<GiftOutlined />} tone="promo" />
          <Metric label="Lợi nhuận gộp" value={money(data?.grossProfit)} detail="Doanh thu trừ giá trị voucher" icon={<RiseOutlined />} tone="profit" />
          <Metric label="Tổng số chuyến đi" value={data ? count.format(data.tripCount) : "—"} icon={<CarOutlined />} detail={
            <>
              <span>Mọi trạng thái · theo ngày đặt</span>
              {change !== null ? (
                <span className="dashboard-trend" data-direction={change < 0 ? "down" : change > 0 ? "up" : "flat"}>
                  <strong>{change > 0 ? "+" : ""}{percentage(change)}</strong> so với kỳ trước
                </span>
              ) : data && <span className="dashboard-trend">Kỳ trước chưa có chuyến</span>}
            </>
          } />
        </div>
      </section>
      <section className="dashboard-wallets dashboard-section" aria-labelledby="dashboard-wallets" aria-busy={query.isPending}>
        <div className="dashboard-section-heading">
          <div>
            <h3 id="dashboard-wallets">Sức khỏe tài chính</h3>
            <p>Số dư đang giữ hộ và tiền đang chờ chi trả.</p>
          </div>
          <div className="dashboard-wallet-total"><span>Tổng nghĩa vụ ví</span><strong>{money(held)}</strong></div>
        </div>
        <div className="dashboard-wallet-grid">
          <Metric label="Ví tiền mặt tài xế" value={money(wallets?.driverCash)} icon={<WalletOutlined />} detail={
            <>{"Số dư khả dụng"}{wallets && <span className="dashboard-trend">Giữ cho lệnh rút: <strong>{money(wallets.pendingWithdrawals)}</strong></span>}</>
          } />
          <Metric label="Ví khách hàng" value={money(wallets?.customer)} detail="Số dư khách chưa sử dụng" icon={<TeamOutlined />} />
          <Metric label="Ví tín dụng tài xế" value={money(wallets?.driverCredit)} detail="Cộng các số dư dương dùng để trừ chiết khấu" icon={<CreditCardOutlined />} />
        </div>
      </section>
      <FinanceCharts data={data} period={period} loading={query.isPending} />
    </>
  );
}
