import { lazy, Suspense, useState } from "react";
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Alert,
  App,
  Button,
  Drawer,
  Form,
  Input,
  Layout,
  Menu,
  Space,
  Typography,
} from "antd";
import {
  CarOutlined,
  DashboardOutlined,
  FileProtectOutlined,
  LogoutOutlined,
  MenuOutlined,
  TeamOutlined,
  UserOutlined,
  WalletOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { useAuth } from "./auth";
import { errorMessage } from "./lib/api";
import { Loading } from "./components/common";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Rides = lazy(() =>
  import("./pages/Rides").then((m) => ({ default: m.Rides })),
);
const RideDetail = lazy(() =>
  import("./pages/Rides").then((m) => ({ default: m.RideDetailPage })),
);
const Drivers = lazy(() =>
  import("./pages/Drivers").then((m) => ({ default: m.Drivers })),
);
const DriverDetail = lazy(() =>
  import("./pages/Drivers").then((m) => ({ default: m.DriverDetailPage })),
);
const Documents = lazy(() =>
  import("./pages/Drivers").then((m) => ({ default: m.Documents })),
);
const Customers = lazy(() =>
  import("./pages/Customers").then((m) => ({ default: m.Customers })),
);
const CustomerDetail = lazy(() =>
  import("./pages/Customers").then((m) => ({ default: m.CustomerDetailPage })),
);
const Pricing = lazy(() => import("./pages/Pricing"));
const navigation = [
  { key: "/dashboard", label: "Tổng quan", icon: <DashboardOutlined /> },
  { key: "/rides", label: "Chuyến đi", icon: <CarOutlined /> },
  { key: "/drivers", label: "Tài xế", icon: <UserOutlined /> },
  {
    key: "/driver-documents",
    label: "Duyệt hồ sơ",
    icon: <FileProtectOutlined />,
  },
  { key: "/customers", label: "Khách hàng", icon: <TeamOutlined /> },
  { key: "/pricing-rules", label: "Bảng giá", icon: <WalletOutlined /> },
];
export function Login() {
  const auth = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  if (auth.loading) return <Loading />;
  if (auth.profile) {
    const from = location.state?.from;
    return (
      <Navigate
        replace
        to={
          typeof from === "string" &&
          from.startsWith("/") &&
          !from.startsWith("//") &&
          !from.startsWith("/login")
            ? from
            : "/dashboard"
        }
      />
    );
  }
  return (
    <div className="login-page">
      <main className="login-card">
        <div className="brand-mark">
          <CarOutlined />
        </div>
        <div className="login-eyebrow">LÁI HỘ · QUẢN TRỊ</div>
        <Typography.Title level={1}>Đăng nhập quản trị</Typography.Title>
        <Typography.Paragraph type="secondary">
          Quản lý chuyến đi và vận hành dịch vụ.
        </Typography.Paragraph>
        {auth.configError && (
          <Alert
            type="warning"
            showIcon
            title="Cần cấu hình ứng dụng"
            description={auth.configError}
          />
        )}
        {(error || auth.sessionError) && (
          <Alert type="error" showIcon title={error || auth.sessionError} />
        )}
        <Form
          layout="vertical"
          requiredMark={false}
          onFinish={async ({
            email,
            password,
          }: {
            email: string;
            password: string;
          }) => {
            if (pending) return;
            setError(null);
            setPending(true);
            try {
              await auth.login(email, password);
            } catch (e) {
              setError(errorMessage(e));
            } finally {
              setPending(false);
            }
          }}
        >
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Nhập email quản trị." },
              { type: "email", message: "Email không hợp lệ." },
            ]}
          >
            <Input
              autoComplete="username"
              placeholder="admin@example.com"
              size="large"
            />
          </Form.Item>
          <Form.Item
            label="Mật khẩu"
            name="password"
            rules={[{ required: true, message: "Nhập mật khẩu." }]}
          >
            <Input.Password
              autoComplete="current-password"
              placeholder="Nhập mật khẩu"
              size="large"
            />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            loading={pending}
            disabled={!!auth.configError}
          >
            Đăng nhập
          </Button>
        </Form>
        <div className="login-note">
          <SafetyCertificateOutlined /> Chỉ dành cho tài khoản đã được cấp quyền
          quản trị.
        </div>
      </main>
      <footer className="login-footer">
        Lái Hộ · Hệ thống quản lý dịch vụ
      </footer>
    </div>
  );
}
function ProtectedLayout() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { message } = App.useApp();
  if (auth.loading) return <Loading />;
  if (!auth.profile)
    return (
      <Navigate
        replace
        to="/login"
        state={{ from: location.pathname + location.search }}
      />
    );
  const selected = navigation.find(
    (n) =>
      location.pathname === n.key || location.pathname.startsWith(`${n.key}/`),
  );
  const menu = (
    <>
      <Link
        className="sidebar-brand"
        to="/dashboard"
        onClick={() => setOpen(false)}
      >
        <span className="brand-icon">
          <CarOutlined />
        </span>
        <span>
          Lái Hộ<small>TRANG QUẢN TRỊ</small>
        </span>
      </Link>
      <Menu
        mode="inline"
        selectedKeys={[selected?.key ?? ""]}
        items={navigation}
        onClick={({ key }) => {
          navigate(key);
          setOpen(false);
        }}
      />
      <div className="sidebar-bottom">Không gian quản lý vận hành</div>
    </>
  );
  return (
    <Layout className="admin-layout">
      <Layout.Sider className="desktop-sidebar" width={232} theme="light">
        {menu}
      </Layout.Sider>
      <Drawer
        title="Điều hướng"
        placement="left"
        size={280}
        open={open}
        onClose={() => setOpen(false)}
        styles={{ body: { padding: 0 } }}
      >
        {menu}
      </Drawer>
      <Layout className="main-layout">
        <Layout.Header className="topbar">
          <Space>
            <Button
              className="mobile-menu"
              icon={<MenuOutlined />}
              aria-label="Mở điều hướng"
              onClick={() => setOpen(true)}
            />
            <span className="section-name">
              {selected?.label || "Quản trị"}
            </span>
          </Space>
          <Space className="account-actions">
            <span className="account-name">
              <UserOutlined />{" "}
              {auth.profile.fullName || auth.profile.email || "Admin"}
            </span>
            <Button
              icon={<LogoutOutlined />}
              aria-label="Đăng xuất"
              loading={loggingOut}
              onClick={async () => {
                setLoggingOut(true);
                try {
                  await auth.logout();
                } catch {
                  void message.warning(
                    "Đã đóng phiên trên web. Không thể xác nhận đăng xuất với máy chủ.",
                  );
                } finally {
                  setLoggingOut(false);
                }
              }}
            >
              Đăng xuất
            </Button>
          </Space>
        </Layout.Header>
        <Layout.Content className="page-content">
          <Suspense fallback={<Loading />}>
            <Outlet key={location.pathname} />
          </Suspense>
        </Layout.Content>
        <Layout.Footer className="app-footer">
          Lái Hộ · Quản lý dịch vụ
        </Layout.Footer>
      </Layout>
    </Layout>
  );
}
export function AdminApp() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedLayout />}>
        <Route index element={<Navigate replace to="/dashboard" />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="rides" element={<Rides />} />
        <Route path="rides/:id" element={<RideDetail />} />
        <Route path="drivers" element={<Drivers />} />
        <Route path="drivers/:id" element={<DriverDetail />} />
        <Route path="driver-documents" element={<Documents />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="pricing-rules" element={<Pricing />} />
        <Route
          path="*"
          element={
            <div>
              <Typography.Title level={2}>
                Không tìm thấy trang
              </Typography.Title>
              <Link to="/dashboard">Về trang tổng quan</Link>
            </div>
          }
        />
      </Route>
    </Routes>
  );
}
