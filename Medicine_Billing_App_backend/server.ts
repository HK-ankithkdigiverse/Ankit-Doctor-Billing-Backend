import 'dotenv/config';
import app from './src';
import { connectDatabase } from './src/database';
import { logger } from './src/helper';

const port = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDatabase();
        app.listen(port, () => {
            logger.info("server started", { port });
        });
    } catch (error) {
        logger.error("Failed to start server", error);
        process.exit(1);
    }
};

startServer();
