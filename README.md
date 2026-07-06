# HRM - HQ Group

Phần mềm quản trị nhân sự (HRM) cho HQ Group — chạy trên nền web, tối ưu để deploy lên **Vercel**.

## Tính năng

### 1. Quản lý thông tin, hồ sơ nhân sự
- Hồ sơ đầy đủ: thông tin cá nhân, CCCD, liên hệ, phòng ban, chức vụ, hợp đồng, lương cơ bản, phụ cấp, tài khoản ngân hàng
- Quản lý phòng ban, gán trưởng phòng (người duyệt đơn)
- Tìm kiếm theo tên / mã nhân viên, chuyển trạng thái thử việc / chính thức / nghỉ việc

### 2. Công - Lương - Phép - Ca
- **Ca làm việc**: định nghĩa ca (giờ vào/ra, nghỉ giữa ca), nhân viên **đăng ký ca** theo khoảng ngày, quản lý duyệt
- **Chấm công**: import file CSV/TXT từ **máy chấm công**, tự động tổng hợp bảng công tháng (giờ công, đi muộn, tăng ca OT, nghỉ phép, vắng)
- **Nghỉ phép**: loại phép (phép năm, ốm, không lương, cưới...), số dư phép năm 12 ngày, tạo đơn — duyệt đơn — tự trừ phép
- **Bảng lương**: tạo kỳ lương tháng, tính lương tự động từ bảng công (lương theo ngày công + OT ×1.5 − BHXH/BHYT/BHTN 10.5% − thuế TNCN lũy tiến), chốt kỳ để phát hành phiếu lương

### 3. Đa tài khoản & phân quyền
| Vai trò | Quyền hạn |
|---|---|
| **ADMIN** | Toàn quyền + quản lý tài khoản, phân quyền |
| **HR** | Quản lý hồ sơ, phòng ban, ca, chấm công, phép, lương; duyệt mọi đơn |
| **MANAGER** (Quản lý) | Xem nhân viên phòng mình, **duyệt đơn nghỉ phép / đăng ký ca** của phòng mình |
| **EMPLOYEE** (Nhân viên) | Xem hồ sơ, bảng công, phiếu lương của mình; xin nghỉ phép, đăng ký ca |

## Công nghệ
- [Next.js 14](https://nextjs.org) (App Router) + TypeScript + Tailwind CSS
- [Prisma](https://prisma.io) + PostgreSQL (Neon / Vercel Postgres / Supabase)
- [NextAuth](https://next-auth.js.org) — đăng nhập email + mật khẩu (bcrypt), phiên JWT

## Triển khai lên Vercel (khuyến nghị)

### Bước 1 — Tạo database PostgreSQL
Tạo database miễn phí tại [Neon](https://neon.tech) (hoặc trong tab **Storage** của Vercel).
Lấy chuỗi kết nối dạng:
```
postgresql://user:password@ep-xxx.aws.neon.tech/hrm?sslmode=require
```

### Bước 2 — Khởi tạo dữ liệu (chạy 1 lần từ máy của bạn)
```bash
git clone <repo này> && cd HRM---HQ
npm install
cp .env.example .env        # sửa DATABASE_URL trỏ tới database ở Bước 1
npm run db:push             # tạo bảng
npm run db:seed             # tạo dữ liệu mẫu + tài khoản mặc định
```

### Bước 3 — Deploy
1. Vào [vercel.com](https://vercel.com) → **Add New Project** → import repo GitHub này
2. Thêm biến môi trường (Settings → Environment Variables):
   - `DATABASE_URL` — chuỗi kết nối ở Bước 1
   - `NEXTAUTH_SECRET` — chuỗi ngẫu nhiên, tạo bằng `openssl rand -base64 32`
   - `NEXTAUTH_URL` — `https://<ten-du-an>.vercel.app`
3. Bấm **Deploy**. Xong!

### Tài khoản mặc định (đổi mật khẩu ngay sau khi đăng nhập)
| Vai trò | Email | Mật khẩu |
|---|---|---|
| ADMIN | admin@hqgroup.vn | admin@123 |
| HR | hr@hqgroup.vn | hr@12345 |
| Quản lý | manager@hqgroup.vn | manager@123 |
| Nhân viên | an.le@hqgroup.vn | nhanvien@123 |

## Chạy local
```bash
npm install
cp .env.example .env   # điền DATABASE_URL + NEXTAUTH_SECRET
npm run db:push && npm run db:seed
npm run dev            # http://localhost:3000
```

## Định dạng file máy chấm công
File CSV/TXT, mỗi dòng: `mã nhân viên, ngày giờ chấm[, mã máy]`
```
HQ001,2026-07-01 07:58:12,MAY01
HQ001,2026-07-01 17:35:40,MAY01
HQ003,01/07/2026 08:05,MAY02
```
- Mã nhân viên trong hệ thống phải **trùng mã trên máy chấm công**
- Lần chấm đầu tiên trong ngày = giờ vào, lần cuối = giờ ra
- Import xong bấm **"Tổng hợp công"** để tính bảng công tháng

## Quy trình vận hành gợi ý hàng tháng
1. Nhân viên đăng ký ca (nếu làm theo ca) → quản lý duyệt
2. Nhân viên xin nghỉ phép → quản lý/HR duyệt
3. Cuối tháng: HR import dữ liệu máy chấm công → **Tổng hợp công**
4. HR tạo kỳ lương → **Tính lương** → kiểm tra → **Chốt kỳ lương**
5. Nhân viên xem phiếu lương trong mục *Bảng lương*

## Ghi chú công thức lương (có thể tùy chỉnh trong `src/lib/payroll.ts`)
- Lương theo công = Lương cơ bản ÷ ngày công chuẩn × (ngày công + phép hưởng lương)
- Tiền OT = lương giờ × 1.5 × số giờ OT
- Bảo hiểm người lao động đóng: 10.5% lương cơ bản (trần 46,8 triệu)
- Thuế TNCN: biểu lũy tiến từng phần, giảm trừ bản thân 11 triệu/tháng (chưa gồm người phụ thuộc)
