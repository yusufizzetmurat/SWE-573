/**
 * Centralized logging utility
 * Replaces console.error/console.warn with proper error handling
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  error?: Error;
  context?: Record<string, unknown>;
  timestamp: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 100;

  private log(level: LogLevel, message: string, error?: Error, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level,
      message,
      error,
      context,
      timestamp: new Date().toISOString(),
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // In development, still log to console for debugging
    if (import.meta.env.DEV) {
      const logMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
      if (error) {
        logMethod(`[${level.toUpperCase()}] ${message}`, error, context || '');
      } else {
        logMethod(`[${level.toUpperCase()}] ${message}`, context || '');
      }
    }

    // In production, you could send logs to a logging service
    // Example: sendToLoggingService(entry);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log('error', message, error, context);
  }

  warn(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log('warn', message, error, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, undefined, context);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, undefined, context);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}

export const logger = new Logger();




