import { NextFunction, Request, Response } from "express";
import chalk from "chalk"; // For colored output
import prettyjson from "prettyjson"; // For formatting JSON logs nicely

const logger = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime(); // Start time tracking
  const method = req.method;
  const url = req.originalUrl;
  const ip = req.ip || req.socket.remoteAddress;
  const userAgent = req.get("User-Agent") || "Unknown";

  // Process body only for relevant methods
  let body = null;
  if (
    ["POST", "PUT", "PATCH"].includes(method) &&
    Object.keys(req.body).length > 0
  ) {
    body = prettyjson.render(req.body, {
      keysColor: "cyan",
      stringColor: "yellow",
      numberColor: "magenta",
    });
  }

  // Log the request details
  const methodColor =
    method === "GET"
      ? chalk.bgGreen.black
      : method === "POST"
      ? chalk.bgYellowBright.white
      : method === "PUT"
      ? chalk.bgBlue.black
      : method === "PATCH"
      ? chalk.bgMagenta.white
      : method === "DELETE"
      ? chalk.bgRed.white
      : chalk.bgWhite.black;

  console.log(`\n`);
  console.log(chalk.gray("----------------------------------------------"));
  console.log(
    methodColor.bold(` ${method} `), // Solid background color for methods
    chalk.cyan(url),
    chalk.yellow(`IP: ${ip}`),
    chalk.magenta(`User-Agent: ${userAgent}`),
    chalk.blue(`[${new Date().toLocaleString()}]`)
  );

  if (body) {
    console.log(chalk.gray("Body:"));
    console.log(body);
  }

  // Capture response time
  res.on("finish", () => {
    const [seconds, nanoseconds] = process.hrtime(start);
    const duration = (seconds * 1000 + nanoseconds / 1e6).toFixed(2); // Convert to ms

    console.log(
      methodColor.bold(` ${method} `),
      chalk.cyan(url),
      chalk.yellow(`Status: ${res.statusCode}`),
      chalk.red(`Duration: ${duration}ms`),
      chalk.blue(`[${new Date().toLocaleString()}]`)
    );
    console.log(chalk.gray("----------------------------------------------"));
    console.log(`\n`);
  });

  next();
};

export default logger;
