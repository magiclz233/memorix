export const generatePagination = (currentPage: number, totalPages: number) => {
  // 如果总页数不超过 7，则直接展示所有页码。
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // 如果当前页在前 3 页，展示前 3 页、一个省略号和最后 2 页。
  if (currentPage <= 3) {
    return [1, 2, 3, '...', totalPages - 1, totalPages];
  }

  // 如果当前页在最后 3 页，展示前 2 页、一个省略号和最后 3 页。
  if (currentPage >= totalPages - 2) {
    return [1, 2, '...', totalPages - 2, totalPages - 1, totalPages];
  }

  // 如果当前页在中间区间，展示首页、省略号、当前页及其相邻页、再一个省略号和末页。
  return [
    1,
    '...',
    currentPage - 1,
    currentPage,
    currentPage + 1,
    '...',
    totalPages,
  ];
};
