export function shouldIncludeCategoryProviders(task) {
  return task?.type === "find_service"
    && Array.isArray(task.taxonomyNodeIds)
    && task.taxonomyNodeIds.some(id => Number.isInteger(Number(id)));
}
