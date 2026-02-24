import app from './src';
import { connectDatabase } from './src/database';
import config from './config';

const port = config.port;

const startServer = async () => {
    try {
        await connectDatabase();
        app.listen(port, () => {
            console.log("server started", { port });
        });
    } catch (error) {
        console.error("Failed to start server", error);
        process.exit(1);
    }
};

startServer();


