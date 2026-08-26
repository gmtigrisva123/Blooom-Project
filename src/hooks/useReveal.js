import { useEffect } from 'react';

/* ==========================================================================
   USEREVEAL — hiện dần nội dung khi nó cuộn vào khung nhìn.

   Một IntersectionObserver duy nhất cho cả trang, và mỗi phần tử được bỏ theo
   dõi ngay sau lần hiện đầu tiên: nội dung đã đọc rồi thì không có lý do gì
   để nó mờ đi lần nữa khi người dùng cuộn ngược lên.

   Các phần tử cùng một hàng lệch nhau một nhịp ngắn theo thứ tự trong DOM,
   nên một lưới thẻ vào khung nhìn theo trình tự chứ không nhảy cùng lúc.
   ========================================================================== */
export const useReveal = (deps = []) => {
  useEffect(() => {
    const nodes = document.querySelectorAll('[data-reveal]:not(.in)');
    if (nodes.length === 0) return undefined;

    /* Không có IntersectionObserver (hoặc người dùng đã tắt hiệu ứng) thì
       hiện thẳng — nội dung không bao giờ được phép phụ thuộc vào hiệu ứng. */
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!('IntersectionObserver' in window) || reduced) {
      nodes.forEach((el) => el.classList.add('in'));
      return undefined;
    }

    const timers = [];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const index = Array.from(el.parentNode.children).indexOf(el);
          timers.push(setTimeout(() => el.classList.add('in'), (index % 6) * 70));
          observer.unobserve(el);
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 }
    );

    nodes.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};
