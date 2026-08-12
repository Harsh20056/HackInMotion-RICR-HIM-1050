import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./shared/lib/logger.js";

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`Samadhan backend listening on port ${env.PORT}`);
});
