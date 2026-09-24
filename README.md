# Elevator Chooser · Chọn thang máy

Ứng dụng tiếng Việt để tìm cấu hình Shanghai Mitsubishi theo tải trọng, cửa và kích thước công trình; xem mặt bằng, mặt cắt, bảng thông số và tải **DWG AutoCAD 2018** ngay trên trình duyệt.

Website hiện hành: [des.vietchaopcs.vn](https://des.vietchaopcs.vn/). Repo này chứa mã nguồn; việc push vào repo không tự cập nhật website đó.

## Chạy trên máy

Cần **Python 3** để phục vụ web; **Node.js 20+** để chạy kiểm tra. Không cần cài thư viện npm hoặc dựng lại ứng dụng.

```sh
git clone https://github.com/dqieu/elevator-chooser.git
cd elevator-chooser
python3 -m http.server 8080 --bind 127.0.0.1 --directory dist
```

Mở [localhost:8080](http://localhost:8080). Hoặc dùng `npm start`. Không mở `index.html` bằng `file://` vì trình duyệt cần tải ES modules, worker và WebAssembly qua HTTP.

## Sử dụng

1. Nhập tải trọng tối thiểu và các kích thước đã biết; chọn kiểu cửa nếu cần.
2. Chọn cấu hình, mở **Kiểm tra & xuất bản vẽ**.
3. Điều chỉnh thông số, số điểm dừng, chiều cao tầng, OH/PIT và thông tin công trình.
4. Bấm **Dựng bản vẽ**, xem từng tờ, rồi **Tải CAD (.dwg)**.

Dữ liệu cấu hình được xử lý trong trình duyệt. Bộ xuất DWG chạy bằng WebAssembly; không cần máy chủ chuyển đổi. Bảng thông số chỉ có giá trị công trình; dữ liệu chưa nhập hiển thị `Chưa xác định`.

## Kiểm tra

```sh
npm test
npm run check
```

Các kiểm tra bao gồm công thức/điều kiện chọn, diện tích cabin, trạng thái công trình, mặt bằng, mặt cắt, sáu bộ bản vẽ và 18 bản xuất WASM. Kết quả kiểm tra được ghi vào `analysis/` (không đưa vào Git).

Kiểm tra DWG độc lập bằng ODA File Converter và ezdxf:

```sh
python3 -m venv .venv
.venv/bin/pip install ezdxf
node scripts/test-cad-template.mjs --dwg
# Dùng ODA chuyển analysis/cad/template-test/dwg/*.dwg thành DXF
# vào analysis/cad/template-test/roundtrip/ (AutoCAD 2018, audit bật).
.venv/bin/python scripts/audit-cad-template.py --roundtrip
```

`verify.mjs` là phép so sánh với giá trị cache Excel gốc; cần fixture riêng `analysis/fixtures.json`, không nằm trong bản public và không thuộc `npm test`.

## Cấu trúc

- `dist/`: mã ES module có thể sửa trực tiếp, giao diện, công thức đã biên dịch, vector CAD và WASM dựng sẵn.
- `dist/chooser.mjs`, `excel.mjs`, `rules.mjs`: tìm cấu hình và tính toán.
- `dist/cad-*.mjs`: hình học, chi tiết và bố cục bản vẽ; `dwg*.mjs`: xuất DWG.
- `scripts/`: kiểm tra, trích xuất nguồn riêng và công cụ dựng WASM.
- `scripts/dwg-wasm/`: mã Rust, Cargo.lock và script dựng; pin acadrust 0.5.5 / wasm-bindgen 0.2.104.

Không có bước bundle. Để dựng lại WASM, cài Rust, target `wasm32-unknown-unknown` và `wasm-bindgen-cli` 0.2.104 rồi chạy `sh scripts/dwg-wasm/build.sh`.

Các script trích xuất Excel/DWG dành cho người có bản nguồn riêng. Repo cung cấp tài sản đã biên dịch để chạy và kiểm tra, không kèm Excel/DWG gốc, mật khẩu, bản giải mã hoặc dữ liệu công trình riêng. Không thể tái tạo các tài sản nguồn đó từ repo một mình.

## Phạm vi bản vẽ

Hỗ trợ sáu nhóm workbook: LEHY-G, LEHY-L-G, LEHY-L-Pro, LEHY-L-S, LEHY-Pro, LEHY-S/LEHY-III-S. Công thức giữ quy tắc workbook; bộ lọc diện tích EN 81-20 có tùy chọn bật/tắt. Thời hạn dữ liệu nguồn là 31/12/2026 và ứng dụng có cảnh báo hết hạn.

Bản vẽ theo kích thước công trình, đơn vị mm, có native DIMENSION. Chi tiết máy/cáp được thích ứng từ mẫu; chúng không xác nhận thiết bị hoặc kết cấu phù hợp mọi model. Mỗi bộ thể hiện một cấu hình; mẫu nguồn có thể trình bày nhiều thang. Kích thước cabin/giếng thay đổi theo đầu vào nên hình không phải bản sao nguyên trạng của một công trình mẫu. Dữ liệu điện chưa biết không tự lấy định mức mẫu. LEHY-L-G chưa có mẫu thiết bị đúng dòng được xác minh.

Nguồn bên thứ ba và giấy phép bộ xuất DWG: [THIRD-PARTY-NOTICES](dist/cad-assets/dwg/THIRD-PARTY-NOTICES.txt). Repo công khai để xem mã; chưa cấp giấy phép chung cho toàn bộ ứng dụng và dữ liệu nguồn.
