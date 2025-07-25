export declare class ApiResponse<T = any> {
    statusCode: number;
    success: boolean;
    message?: string;
    data?: T;
}
