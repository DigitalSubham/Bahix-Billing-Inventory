class ErrorHandler extends Error {
  public statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);

    this.statusCode = statusCode;
    this.name = this.constructor.name;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export default ErrorHandler;
