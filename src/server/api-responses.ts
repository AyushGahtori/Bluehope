export function persistencePending(resource: string) {
  return Response.json(
    {
      status: "persistence_pending",
      resource,
      message:
        "The request shape is accepted by the BlueHope API foundation. MongoDB persistence will activate once environment configuration is provided.",
    },
    { status: 202 },
  );
}

export function notFound(resource: string) {
  return Response.json({ status: "not_found", resource }, { status: 404 });
}
