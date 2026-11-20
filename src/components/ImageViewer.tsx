import { useState } from "react";
import { Button, ConfigProvider, Image, type ImageProps } from "antd";
import {
  CloseOutlined, ColumnWidthOutlined, ColumnHeightOutlined, ReloadOutlined,
  RotateLeftOutlined, RotateRightOutlined, ZoomInOutlined, ZoomOutOutlined,
} from "@ant-design/icons";

const minScale = 0.25;
const maxScale = 8;

export function ImageViewer({ alt, src, ...props }: Omit<ImageProps, "preview" | "alt" | "src"> & {
  src: string; alt: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <button type="button" className="image-viewer-trigger" aria-label={`Xem ảnh: ${alt}`}
      onClick={event => { if (event.currentTarget.contains(event.target as Node)) setOpen(true); }}>
      <Image {...props} key={src} classNames={{ popup: { close: "image-viewer-close" } }} src={src} alt={alt} preview={{
        open, onOpenChange: setOpen, minScale, maxScale, scaleStep: 0.5,
        movable: true, wheel: true, cover: <span>Xem ảnh</span>,
        actionsRender: (_, { actions, transform }) => (
          <ConfigProvider componentDisabled={false}>
          <div className="image-viewer-toolbar" role="group" aria-label="Điều khiển xem ảnh">
            <span className="image-viewer-title">{alt}</span>
            <div className="image-viewer-actions">
              <Button icon={<ZoomOutOutlined />} aria-label="Thu nhỏ ảnh"
                disabled={transform.scale <= minScale} onClick={actions.onZoomOut}>Thu nhỏ</Button>
              <output className="image-viewer-scale" aria-label="Mức phóng ảnh" aria-live="polite">
                {Math.round(transform.scale * 100)}%
              </output>
              <Button icon={<ZoomInOutlined />} aria-label="Phóng to ảnh"
                disabled={transform.scale >= maxScale} onClick={actions.onZoomIn}>Phóng to</Button>
              <Button icon={<RotateLeftOutlined />} aria-label="Xoay trái 90 độ"
                onClick={actions.onRotateLeft}>Xoay trái</Button>
              <Button icon={<RotateRightOutlined />} aria-label="Xoay phải 90 độ"
                onClick={actions.onRotateRight}>Xoay phải</Button>
              <Button icon={<ColumnWidthOutlined />} aria-label="Lật ảnh theo chiều ngang"
                onClick={actions.onFlipX}>Lật ngang</Button>
              <Button icon={<ColumnHeightOutlined />} aria-label="Lật ảnh theo chiều dọc"
                onClick={actions.onFlipY}>Lật dọc</Button>
              <Button icon={<ReloadOutlined />} aria-label="Đặt lại ảnh" onClick={actions.onReset}>Đặt lại ảnh</Button>
              <Button icon={<CloseOutlined />} aria-label="Đóng ảnh" onClick={actions.onClose}>Đóng ảnh</Button>
            </div>
          </div>
          </ConfigProvider>
        ),
      }} />
    </button>
  );
}
