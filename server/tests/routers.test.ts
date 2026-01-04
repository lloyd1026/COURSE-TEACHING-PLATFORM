import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "../routers";
import * as db from "../db";
import * as auth from "../auth";
import { sdk } from "../_core/sdk";

// Mock the db and auth modules
vi.mock("../db");
vi.mock("../auth");
vi.mock("../_core/sdk");

const mockUser = {
    id: 1,
    username: "teacher1",
    role: "teacher",
    name: "Teacher One",
    email: "teacher@example.com",
};

const createCaller = (user: any = null) => {
    const ctx = {
        user,
        req: {
            headers: {},
            cookies: {},
        } as any,
        res: {
            cookie: vi.fn(),
            clearCookie: vi.fn(),
        } as any,
    };
    return appRouter.createCaller(ctx);
};

describe("API Routers", () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe("auth", () => {
        it("register should create a user", async () => {
            vi.mocked(auth.getUserByUsername).mockResolvedValue(undefined);
            vi.mocked(auth.createUser).mockResolvedValue(undefined);

            const caller = createCaller();
            const result = await caller.auth.register({
                username: "newuser",
                password: "password123",
                name: "New User",
                role: "student",
            });

            expect(result).toEqual({ success: true });
            expect(auth.createUser).toHaveBeenCalledWith(expect.objectContaining({
                username: "newuser",
                role: "student",
            }));
        });

        it("login should return success and user info", async () => {
            const user = { ...mockUser, loginMethod: "system" } as any;
            vi.mocked(auth.authenticateUser).mockResolvedValue(user);
            vi.mocked(sdk.signSession).mockResolvedValue("mock-token");

            const caller = createCaller();
            const result = await caller.auth.login({
                username: "teacher1",
                password: "password",
            });

            expect(result.success).toBe(true);
            expect(result.user.username).toBe("teacher1");
            expect(sdk.signSession).toHaveBeenCalled();
        });
    });

    describe("courses", () => {
        it("create should return new course id", async () => {
            vi.mocked(db.createCourse).mockResolvedValue({ id: 101 });

            const caller = createCaller(mockUser);
            const result = await caller.courses.create({
                name: "New Course",
                code: "CS101",
                description: "Intro to CS",
                semester: "2023-Spring",
                credits: 3,
                status: "draft",
            });

            expect(result).toEqual({ id: 101 });
            expect(db.createCourse).toHaveBeenCalledWith(expect.objectContaining({
                teacherId: mockUser.id,
                name: "New Course",
            }));
        });

        it("list should return courses based on role", async () => {
            vi.mocked(db.getCoursesByTeacherId).mockResolvedValue([{ id: 1, name: "Test Course" } as any]);

            const caller = createCaller(mockUser);
            const result = await caller.courses.list();

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe("Test Course");
            expect(db.getCoursesByTeacherId).toHaveBeenCalledWith(mockUser.id, undefined);
        });
    });
});
