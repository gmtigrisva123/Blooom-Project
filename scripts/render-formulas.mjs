/* ===========================================================================
   BLOOOM — DỰNG SẴN CÔNG THỨC TOÁN

   Mọi công thức trong Blooom đều tĩnh: chúng là các mô hình mà ứng dụng thực
   sự đánh giá, không phải thứ người dùng nhập vào. Vì vậy không có lý do gì
   để gửi cả thư viện KaTeX (~75 KB sau nén) xuống trình duyệt chỉ để dựng lại
   cùng mười công thức đó ở mỗi lần tải trang.

   Script này chạy KaTeX MỘT LẦN lúc phát triển và ghi ra HTML tĩnh vào
   src/generated/formulas.js. Ứng dụng chỉ nhúng chuỗi HTML đó cùng tệp CSS của
   KaTeX — chi phí JavaScript lúc chạy bằng không, công thức hiện ra ngay từ
   khung hình đầu tiên, không nhảy layout, và vẫn đúng cả khi JavaScript hỏng.

   Danh mục nằm ngay trong tệp này, cố ý: nếu tách nguồn TeX sang một tệp khác
   thì hai nơi sẽ trôi khỏi nhau. Đây là một nguồn sự thật duy nhất cho mọi
   công thức mà ứng dụng trưng ra.

   Cách dùng:
     npm run formulas         ghi lại src/generated/formulas.js
     npm run formulas:check   báo lỗi nếu tệp đã sinh không khớp danh mục
   =========================================================================== */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import katex from 'katex';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src/generated/formulas.js');

/* ---------------------------------------------------------------------------
   DANH MỤC

   `display: true` cho công thức đứng riêng một dòng (căn giữa, dấu tổng và
   phân số cỡ lớn); `false` cho công thức chen giữa dòng văn.

   Dấu thập phân dùng dấu phẩy theo chuẩn Việt Nam. Trong TeX phải viết `0{,}1`
   chứ không phải `0,1`: dấu phẩy trần bị KaTeX hiểu là dấu ngăn cách và chèn
   thêm khoảng trắng sau nó, cho ra "0, 1".
   --------------------------------------------------------------------------- */
const FORMULAS = {
  /* SM-2, Wozniak & Gorzelanczyk 1994 — cập nhật hệ số dễ sau mỗi lần chấm.

     Ngắt thành hai dòng bằng `aligned` chứ không để một dòng dài: thẻ trưng
     công thức này ở trang giới thiệu chỉ rộng khoảng 232px trên màn hình
     1280px (lưới bốn cột), và một dòng thì cần tới 316px. Thu nhỏ cỡ chữ cho
     vừa sẽ đẩy công thức xuống mức khó đọc; ngắt dòng ở dấu trừ là cách trình
     bày thông thường của một quy tắc cập nhật dài. */
  easeFactor: {
    display: true,
    tex: String.raw`\begin{aligned}EF' ={}& EF + 0{,}1 \\ &- (5-q)\bigl(0{,}08 + 0{,}02\,(5-q)\bigr)\end{aligned}`
  },

  /* Đường cong quên Ebbinghaus 1885, kèm hằng số ổn định suy từ giả định lịch.

     Nhãn biến viết bằng chữ Latin không dấu: bộ phông của KaTeX không có
     metric cho ký tự tiếng Việt có dấu, nên `\text{khoảng ôn}` sẽ dựng ra một
     chuỗi lỗi. Ý nghĩa của biến được giải thích bằng văn xuôi ngay cạnh công
     thức, chứ không nhét vào trong công thức. */
  forgetting: {
    display: true,
    tex: String.raw`R(t) = e^{-t/S}, \qquad S = \frac{\text{interval}}{-\ln 0{,}9}`
  },

  /* Dạng rút gọn, dùng khi chen giữa câu văn hoặc trong chú thích đồ thị. */
  forgettingShort: {
    display: false,
    tex: String.raw`R(t) = e^{-t/S}`
  },

  /* Kiểm định t của Welch 1947 cho hai phương sai không bằng nhau. */
  welchT: {
    display: true,
    tex: String.raw`t = \frac{\bar{x}_1 - \bar{x}_2}{\sqrt{\dfrac{s_1^2}{n_1} + \dfrac{s_2^2}{n_2}}}`
  },

  /* Bậc tự do Welch–Satterthwaite — con số ứng dụng thật sự tính ra. */
  welchDf: {
    display: true,
    tex: String.raw`\nu = \frac{\left(\dfrac{s_1^2}{n_1} + \dfrac{s_2^2}{n_2}\right)^{\!2}}{\dfrac{(s_1^2/n_1)^2}{n_1-1} + \dfrac{(s_2^2/n_2)^2}{n_2-1}}`
  },

  /* Cỡ tác động Hedges' g — Cohen's d đã hiệu chỉnh chệch mẫu nhỏ. */
  hedgesG: {
    display: true,
    tex: String.raw`g = \frac{\bar{x}_1 - \bar{x}_2}{s_p} \cdot \left(1 - \frac{3}{4(n_1+n_2)-9}\right)`
  },

  /* Mô hình cosinor Halberg 1969 — nhịp 24 giờ. */
  cosinor: {
    display: true,
    tex: String.raw`y(h) = M + A\cos\!\left(\frac{2\pi\,(h - \varphi)}{24}\right)`
  },

  cosinorShort: {
    display: false,
    tex: String.raw`y(h) = M + A\cos\!\left(\tfrac{2\pi(h-\varphi)}{24}\right)`
  },

  /* Hồi quy tuyến tính bình phương tối thiểu cho dự báo tuần. */
  ols: {
    display: false,
    tex: String.raw`\hat{y} = a + b\,t`
  },

  /* Hệ số biến thiên — thước đo độ đều của lịch học. */
  cv: {
    display: false,
    tex: String.raw`CV = \sigma / \bar{x}`
  }
};

/* ---------------------------------------------------------------------------
   DỰNG
   --------------------------------------------------------------------------- */
const render = () => {
  const entries = Object.entries(FORMULAS).map(([id, { tex, display }]) => {
    const html = katex.renderToString(tex, {
      displayMode: display,
      /* Ném lỗi ngay lúc dựng thay vì âm thầm in ra chữ đỏ trong giao diện:
         một công thức sai cú pháp phải làm hỏng bản build, không phải làm hỏng
         trang của người dùng. */
      throwOnError: true,
      strict: 'warn',
      /* Sinh kèm MathML để trình đọc màn hình đọc được công thức, thay vì đọc
         to từng ký tự rời của phần trình bày. */
      output: 'htmlAndMathml'
    });

    return [id, { tex, display, html }];
  });

  const body = entries
    .map(
      ([id, v]) =>
        `  ${id}: {\n` +
        `    tex: ${JSON.stringify(v.tex)},\n` +
        `    display: ${v.display},\n` +
        `    html: ${JSON.stringify(v.html)}\n` +
        `  }`
    )
    .join(',\n');

  return (
    '/* TỆP ĐƯỢC SINH TỰ ĐỘNG — ĐỪNG SỬA TAY.\n' +
    '   Nguồn: scripts/render-formulas.mjs · sinh lại bằng `npm run formulas`. */\n\n' +
    'export const FORMULAS = {\n' +
    body +
    '\n};\n'
  );
};

/* ---------------------------------------------------------------------------
   CHẠY
   --------------------------------------------------------------------------- */
const output = render();
const checkOnly = process.argv.includes('--check');

if (checkOnly) {
  const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  if (current !== output) {
    console.error(
      'src/generated/formulas.js đã cũ so với scripts/render-formulas.mjs.\n' +
        'Chạy `npm run formulas` rồi commit lại tệp được sinh.'
    );
    process.exit(1);
  }
  console.log(`Công thức đã khớp (${Object.keys(FORMULAS).length} mục).`);
} else {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, output);
  console.log(`Đã ghi ${OUT} (${Object.keys(FORMULAS).length} công thức).`);
}
