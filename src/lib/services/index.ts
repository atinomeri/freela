/**
 * Service Layer — barrel export
 *
 * Import individual services:
 *   import * as projectService from "@/lib/services/project-service";
 *
 * Or use the barrel:
 *   import { projectService, proposalService } from "@/lib/services";
 */
export * as notificationService from "./notification-service";
export * as proposalService from "./proposal-service";
export * as projectService from "./project-service";
export * as threadService from "./thread-service";
export { ServiceError } from "./errors";
