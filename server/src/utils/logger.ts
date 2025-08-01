import { promises as fs } from 'fs';
import { join } from 'path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    data?: any;
    userId?: string;
    requestId?: string;
    duration?: number;
}

class Logger {
    private logDir: string;
    private isDevelopment: boolean;

    constructor() {
        this.logDir = join(process.cwd(), 'logs');
        this.isDevelopment = process.env.NODE_ENV === 'development';
        this.ensureLogDirectory();
    }

    private async ensureLogDirectory(): Promise<void> {
        try {
            await fs.mkdir(this.logDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create log directory:', error);
        }
    }

    private formatLogEntry(entry: LogEntry): string {
        const { timestamp, level, message, data, userId, requestId, duration } = entry;
        
        let logLine = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
        
        if (userId) logLine += ` | User: ${userId}`;
        if (requestId) logLine += ` | RequestID: ${requestId}`;
        if (duration !== undefined) logLine += ` | Duration: ${duration}ms`;
        if (data) logLine += ` | Data: ${JSON.stringify(data)}`;
        
        return logLine;
    }

    private async writeToFile(filename: string, content: string): Promise<void> {
        try {
            const filePath = join(this.logDir, filename);
            await fs.appendFile(filePath, content + '\n');
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    private getLogFileName(level: LogLevel): string {
        const date = new Date().toISOString().split('T')[0];
        return `${level}-${date}.log`;
    }

    async log(level: LogLevel, message: string, data?: any, userId?: string, requestId?: string, duration?: number): Promise<void> {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            data,
            userId,
            requestId,
            duration
        };

        const formattedEntry = this.formatLogEntry(entry);

        // Console output in development
        if (this.isDevelopment) {
            const colors = {
                debug: '\x1b[36m', // Cyan
                info: '\x1b[32m',  // Green
                warn: '\x1b[33m',  // Yellow
                error: '\x1b[31m'  // Red
            };
            console.log(`${colors[level]}${formattedEntry}\x1b[0m`);
        }

        // File output
        await this.writeToFile(this.getLogFileName(level), formattedEntry);
        await this.writeToFile('combined.log', formattedEntry);
    }

    async debug(message: string, data?: any, userId?: string, requestId?: string): Promise<void> {
        await this.log('debug', message, data, userId, requestId);
    }

    async info(message: string, data?: any, userId?: string, requestId?: string): Promise<void> {
        await this.log('info', message, data, userId, requestId);
    }

    async warn(message: string, data?: any, userId?: string, requestId?: string): Promise<void> {
        await this.log('warn', message, data, userId, requestId);
    }

    async error(message: string, data?: any, userId?: string, requestId?: string): Promise<void> {
        await this.log('error', message, data, userId, requestId);
    }

    async logApiRequest(method: string, path: string, statusCode: number, duration: number, userId?: string, requestId?: string): Promise<void> {
        const message = `${method} ${path} - ${statusCode}`;
        const level: LogLevel = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'info';
        await this.log(level, message, { method, path, statusCode }, userId, requestId, duration);
    }

    async logAIRequest(model: string, prompt: string, responseLength: number, duration: number, userId?: string, requestId?: string): Promise<void> {
        const message = `AI Request to ${model}`;
        await this.log('info', message, {
            model,
            promptLength: prompt.length,
            responseLength,
            promptPreview: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : '')
        }, userId, requestId, duration);
    }

    async logAnalysisStart(projectId: string, opinionCount: number, userId?: string): Promise<void> {
        await this.log('info', `Analysis started for project ${projectId}`, {
            projectId,
            opinionCount
        }, userId);
    }

    async logAnalysisComplete(projectId: string, topicCount: number, duration: number, userId?: string): Promise<void> {
        await this.log('info', `Analysis completed for project ${projectId}`, {
            projectId,
            topicCount
        }, userId, undefined, duration);
    }

    async logSecurityEvent(event: string, details: any, userId?: string, ip?: string): Promise<void> {
        await this.log('warn', `Security event: ${event}`, {
            ...details,
            ip
        }, userId);
    }

    async getLogs(level?: LogLevel, limit: number = 100): Promise<LogEntry[]> {
        try {
            const filename = level ? this.getLogFileName(level) : 'combined.log';
            const filePath = join(this.logDir, filename);
            
            const content = await fs.readFile(filePath, 'utf-8');
            const lines = content.trim().split('\n').slice(-limit);
            
            return lines.map(line => {
                // Parse log entry (simplified)
                const match = line.match(/\[(.*?)\] (\w+): (.*)/);
                if (match) {
                    return {
                        timestamp: match[1],
                        level: match[2].toLowerCase() as LogLevel,
                        message: match[3]
                    };
                }
                return {
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: line
                };
            });
        } catch (error) {
            return [];
        }
    }

    async clearLogs(): Promise<void> {
        try {
            const files = await fs.readdir(this.logDir);
            for (const file of files) {
                if (file.endsWith('.log')) {
                    await fs.unlink(join(this.logDir, file));
                }
            }
            await this.info('Log files cleared');
        } catch (error) {
            console.error('Failed to clear logs:', error);
        }
    }
}

// Singleton instance
export const logger = new Logger();

// Request logging middleware
export const requestLoggingMiddleware = (req: any, res: any, next: any) => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(2, 15);
    
    req.requestId = requestId;
    req.startTime = startTime;

    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any) {
        const duration = Date.now() - startTime;
        const userId = req.userId || req.headers['x-user-id'];
        
        logger.logApiRequest(
            req.method,
            req.path,
            res.statusCode,
            duration,
            userId,
            requestId
        );

        return originalEnd.call(this, chunk, encoding);
    };

    next();
};