export class PasswordMismatchError extends Error {
  constructor(message: string = "Password and confirm password do not match") {
    super(message);
    this.name = "PasswordMismatchError";
  }
}
