## Locale Tool

Chuyển đổi file Excel thành các file JSON đa ngôn ngữ theo từng cột.

### Định dạng Excel

- Cột 1: `key` (ví dụ: `common.loading`)
- Cột 2: `vi` (Tiếng Việt)
- Các cột còn lại: mỗi cột tương ứng một ngôn ngữ (ví dụ: `en`, `ja`, `fr` ...)

Hàng đầu tiên là tiêu đề cột (header).

Ví dụ (header ở dòng 1):

```
key	vi	en
common.loading	Vui lòng chờ ...	Please wait ...
common.noData	Không có dữ liệu	No data
```

### Cài đặt và chạy

Từ thư mục dự án:

```bash

yarn build
node dist/index.js --input=/đường/dẫn/tệp.xlsx --outDir=./locales
```

Tùy chọn:

- `--sheet=Sheet1`: chỉ định tên sheet (mặc định: sheet đầu tiên)
- `--keyCol=key`: tên cột key (mặc định: cột 1)
- `--viCol=vi`: tên cột tiếng Việt (mặc định: cột 2)

Kết quả: tạo các tệp JSON theo tên cột ngôn ngữ (ví dụ: `en.json`, `ja.json`, ...), chứa map `{ key: translation }`.

# locale-tool
