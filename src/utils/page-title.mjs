export function paginatedName(name, currentPage) {
  return currentPage !== undefined && currentPage > 1 ? `${name} · Page ${currentPage}` : name
}

export function paginatedDescription(description, currentPage) {
  return currentPage !== undefined && currentPage > 1 ? `${description} · Page ${currentPage}` : description
}
