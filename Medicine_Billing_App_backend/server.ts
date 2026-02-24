import 'dotenv/config';
import app from './src';
import { connectDatabase } from './src/database';

const port = process.env.PORT || 5000;

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

