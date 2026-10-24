export function paginatedName(name, currentPage) {
  return currentPage !== undefined && currentPage > 1 ? `${name} · Page ${currentPage}` : name
}
