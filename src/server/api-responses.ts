export function persistencePending(resource: string) {
  return Response.json(
    {
      status: "persistence_pending",
      resource,
      message:
        "The request shape is accepted by the BlueHope API foundation. Firestore persistence will activate once Firebase Admin configuration is provided.",
    },
    { status: 202 },
  );
}

export function notFound(resource: string) {
  return Response.json({ status: "not_found", resource }, { status: 404 });
}
