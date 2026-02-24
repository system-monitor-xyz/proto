import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import type { ClientGrpc } from "@nestjs/microservices";
import { LogRequest, LoggerServiceClient } from "proto/logger/logger";

@Injectable()
export class LoggerClientService implements OnModuleInit {
  private loggerService: LoggerServiceClient;
  private serviceName: string;
  private currentTraceId: string | null = null;

  constructor(@Inject("LOGGER_SERVICE") private client: ClientGrpc) {
    this.serviceName = process.env.SERVICE_NAME || "null";
  }

  onModuleInit() {
    this.loggerService =
      this.client.getService<LoggerServiceClient>("LoggerService");
  }

  // Generate a new trace_id for a new request
  generateTraceId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `trace-${timestamp}-${random}`;
  }

  // Set trace_id for the current request context
  setTraceId(traceId: string): void {
    this.currentTraceId = traceId;
  }

  // Get current trace_id
  getTraceId(): string {
    return this.currentTraceId || this.generateTraceId();
  }

  // Clear trace_id after request is done
  clearTraceId(): void {
    this.currentTraceId = null;
  }

  // Basic logging methods
  log(
    message: string,
    context?: string,
    metadata?: Record<string, string>,
  ): void {
    this.sendLog("info", message, context, metadata);
  }

  error(
    message: string,
    trace: string = "",
    context?: string,
    metadata?: Record<string, string>,
  ): void {
    this.sendLog("error", message, context, { ...metadata, trace });
  }

  warn(
    message: string,
    context?: string,
    metadata?: Record<string, string>,
  ): void {
    this.sendLog("warn", message, context, metadata);
  }

  debug(
    message: string,
    context?: string,
    metadata?: Record<string, string>,
  ): void {
    this.sendLog("debug", message, context, metadata);
  }

  // Send log to logger service
  private sendLog(
    level: string,
    message: string,
    context?: string,
    metadata?: Record<string, string>,
  ): void {
    const logRequest: LogRequest = {
      level,
      message,
      service: this.serviceName,
      context: context || "Application",
      traceId: this.getTraceId(),
      timestamp: new Date().toISOString(),
      metadata: metadata || {},
    };

    this.loggerService.log(logRequest).subscribe({
      error: (err) => {
        console.error("Failed to send log to logger service:", err);
        console.log(`[${level.toUpperCase()}] ${message}`);
      },
    });
  }

  // Helper methods for structured logging
  logHttpRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    traceId?: string,
  ): void {
    if (traceId) this.setTraceId(traceId);

    this.log(`HTTP ${method} ${url} ${statusCode}`, "HTTP", {
      method,
      url,
      statusCode: statusCode.toString(),
      duration: duration.toString(),
    });
  }

  logGrpcCall(
    service: string,
    method: string,
    duration: number,
    success: boolean,
  ): void {
    const level = success ? "info" : "error";
    const message = `gRPC ${service}.${method} ${success ? "succeeded" : "failed"}`;

    this.sendLog(level, message, "gRPC", {
      grpc_service: service,
      grpc_method: method,
      duration: duration.toString(),
      success: success.toString(),
    });
  }
}
