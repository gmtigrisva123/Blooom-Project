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

   Script này cũng sinh ra một bản CSS đã lọc của KaTeX — xem phần CSS ở cuối
   tệp.

   Cách dùng:
     npm run formulas         ghi lại src/generated/{formulas.js,katex.css}
     npm run formulas:check   báo lỗi nếu tệp đã sinh không khớp danh mục
   =========================================================================== */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import katex from 'katex';

const require = createRequire(import.meta.url);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src/generated/formulas.js');
const OUT_CSS = join(ROOT, 'src/generated/katex.css');

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
   CSS ĐÃ LỌC

   Tệp katex.min.css gốc khai báo mỗi bộ phông bằng ba định dạng — woff2, woff
   và ttf — để còn chạy được trên những trình duyệt rất cũ. Vite phát sinh MỌI
   tệp mà CSS trỏ tới, nên bản dựng mang theo 59 tệp phông nặng 1,1 MB, trong
   đó khoảng hai phần ba không trình duyệt nào tải về.

   woff2 được hỗ trợ ở mọi trình duyệt từ 2016 (Chrome 36, Firefox 39, Safari
   10, Edge 14) — rộng hơn nhiều so với những thứ Blooom vốn đã dùng như
   `color-mix()`. Giữ lại woff và ttf vì thế không mua thêm được khả năng
   tương thích nào, chỉ làm phình bản dựng.

   Đường dẫn phông được viết lại thành đường dẫn tương đối tính từ tệp CSS
   được sinh tới thư mục dist của gói katex, và được TÍNH RA lúc chạy chứ
   không viết cứng — để nó vẫn đúng khi node_modules nằm ở chỗ khác (pnpm,
   yarn workspace, monorepo).
   --------------------------------------------------------------------------- */
const renderCss = () => {
  const katexCssPath = require.resolve('katex/dist/katex.min.css');
  const source = readFileSync(katexCssPath, 'utf8');

  /* Đường dẫn tương đối từ src/generated/ tới katex/dist/. POSIX hoá dấu gạch
     để CSS sinh trên Windows vẫn dùng được. */
  const toDist = relative(dirname(OUT_CSS), dirname(katexCssPath)).split('\\').join('/');

  let dropped = 0;

  /* Bỏ mọi mục src không phải woff2. Neo vào `format("woff")` /
     `format("truetype")` thay vì vào phần mở rộng của tên tệp, vì tên tệp là
     thứ có thể đổi giữa các phiên bản còn tên định dạng thì không. */
  let css = source.replace(/,url\([^)]+\)\s*format\("(?:woff|truetype)"\)/g, () => {
    dropped += 1;
    return '';
  });

  /* Trỏ url() về đúng thư mục phông của gói. */
  css = css.replace(/url\(fonts\//g, `url(${toDist}/fonts/`);

  const kept = (css.match(/url\(/g) || []).length;

  /* Lưới an toàn: nếu KaTeX đổi cách viết @font-face ở một phiên bản sau và
     biểu thức chính quy không còn khớp, ta phải biết ngay lúc build chứ không
     phải khi công thức hiện ra bằng phông dự phòng trên máy người dùng. */
  if (dropped === 0 || kept === 0) {
    throw new Error(
      `Lọc phông KaTeX thất bại (bỏ ${dropped}, giữ ${kept}). ` +
        'Có thể katex.min.css đã đổi định dạng — hãy kiểm tra lại biểu thức lọc.'
    );
  }

  return {
    css:
      '/* TỆP ĐƯỢC SINH TỰ ĐỘNG — ĐỪNG SỬA TAY.\n' +
      '   Nguồn: katex/dist/katex.min.css, đã lọc bỏ woff và ttf.\n' +
      '   Sinh lại bằng `npm run formulas`. */\n' +
      css.trim() +
      '\n',
    dropped,
    kept
  };
};

/* ---------------------------------------------------------------------------
   CHẠY
   --------------------------------------------------------------------------- */
const output = render();
const { css, dropped, kept } = renderCss();
const checkOnly = process.argv.includes('--check');

const outputs = [
  { path: OUT, content: output, label: `${Object.keys(FORMULAS).length} công thức` },
  { path: OUT_CSS, content: css, label: `${kept} phông woff2, đã bỏ ${dropped} tệp woff/ttf` }
];

if (checkOnly) {
  for (const { path, content } of outputs) {
    const current = existsSync(path) ? readFileSync(path, 'utf8') : '';
    if (current !== content) {
      console.error(
        `${relative(ROOT, path)} đã cũ so với scripts/render-formulas.mjs.\n` +
          'Chạy `npm run formulas` rồi commit lại tệp được sinh.'
      );
      process.exit(1);
    }
  }
  console.log(`Đã khớp: ${outputs.map((o) => o.label).join(' · ')}.`);
} else {
  mkdirSync(dirname(OUT), { recursive: true });
  for (const { path, content, label } of outputs) {
    writeFileSync(path, content);
    console.log(`Đã ghi ${relative(ROOT, path)} (${label}).`);
  }
}
