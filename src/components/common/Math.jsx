import { FORMULAS } from '../../generated/formulas';

/* ==========================================================================
   CÔNG THỨC TOÁN

   Nội dung được KaTeX dựng sẵn lúc phát triển (xem scripts/render-formulas.mjs)
   và nằm trong src/generated/formulas.js. Ở đây chỉ còn việc nhúng chuỗi HTML
   đó vào cây DOM.

   Về dangerouslySetInnerHTML: chuỗi này KHÔNG phải dữ liệu người dùng. Nó là
   hằng số nằm trong chính bundle, do KaTeX sinh ra từ một danh mục TeX cố
   định lúc build, và không có đường nào cho dữ liệu bên ngoài chạm vào. Đây
   đúng là trường hợp mà thuộc tính này dành cho.

   Về khả năng tiếp cận: KaTeX sinh kèm cả MathML. Phần trình bày mang
   aria-hidden, phần MathML là thứ trình đọc màn hình thực sự đọc — nên công
   thức được đọc thành một biểu thức toán, không phải một chuỗi ký tự rời rạc.
   ========================================================================== */

const useFormula = (id) => {
  const formula = FORMULAS[id];

  if (!formula && import.meta.env.DEV) {
    /* Chỉ cảnh báo lúc phát triển. Một mã công thức gõ sai phải lộ ra ngay khi
       lập trình viên nhìn thấy nó, chứ không âm thầm để trống trong bản dựng. */
    console.warn(
      `[blooom] Không có công thức nào mang mã "${id}". ` +
        'Hãy thêm nó vào scripts/render-formulas.mjs rồi chạy `npm run formulas`.'
    );
  }

  return formula;
};

/* Công thức đứng riêng một khối, căn giữa — dùng cho phương trình chính. */
export const MathBlock = ({ id, className = '' }) => {
  const formula = useFormula(id);
  if (!formula) return null;

  return (
    <div
      className={`math-block ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: formula.html }}
    />
  );
};

/* Công thức chen giữa dòng văn — cỡ chữ ăn theo văn bản xung quanh. */
export const MathInline = ({ id, className = '' }) => {
  const formula = useFormula(id);
  if (!formula) return null;

  return (
    <span
      className={`math-inline ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: formula.html }}
    />
  );
};
