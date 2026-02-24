import 'dotenv/config';
import server from './src';
import { connectDatabase } from './src/database';

const port = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDatabase();
        server.listen(port, () => {
            console.log(`server started on port ${port}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();
