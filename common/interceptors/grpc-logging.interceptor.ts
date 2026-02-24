import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { LoggerClientService } from '../../logger/logger-client.service';

@Injectable()
export class GrpcLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerClientService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const rpcContext = context.switchToRpc();
    const data = rpcContext.getData();
    // const metadata = rpcContext.getContext();

    // Get method information
    const className = context.getClass().name;
    const methodName = context.getHandler().name;
    const fullMethod = `${className}.${methodName}`;

    const startTime = Date.now();

    // Extract or generate trace_id from gRPC metadata or request data
    const traceId: string = data?.trace_id || this.logger.generateTraceId();
    this.logger.setTraceId(traceId);

    // Log incoming gRPC call
    // this.logger.log(`gRPC call: ${fullMethod}`, 'gRPC', {
    //   method: methodName,
    //   class: className,
    //   trace_id: traceId,
    // });

    return next.handle().pipe(
      tap((result) => {
        // Success case
        const duration = Date.now() - startTime;

        // this.logger.logGrpcCall(className, methodName, duration, true);

        this.logger.log(
          `gRPC ${fullMethod} completed in ${duration}ms`,
          'gRPC',
          {
            duration: duration.toString(),
            success: 'true',
          },
        );

        this.logger.clearTraceId();
      }),
      catchError((error) => {
        // Error case
        const duration = Date.now() - startTime;

        // this.logger.logGrpcCall(className, methodName, duration, false);

        this.logger.error(
          `gRPC ${fullMethod} failed: ${error.message}`,
          error.stack,
          'gRPC',
          {
            duration: duration.toString(),
            error_message: error.message,
          },
        );

        this.logger.clearTraceId();

        return throwError(() => error);
      }),
    );
  }
}
