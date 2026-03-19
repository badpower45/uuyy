import app from "./app";

export default app;

if (process.env["VERCEL"]) {
  // Vercel serverless runtime will invoke the exported app handler.
  // Do not start a listener in this environment.
  // eslint-disable-next-line no-console
  console.log("Running in Vercel runtime");
} else {
  const rawPort = process.env["PORT"];

  if (!rawPort) {
    throw new Error(
      "PORT environment variable is required but was not provided.",
    );
  }

  const port = Number(rawPort);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}
