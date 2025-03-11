import { FilterQuery, UpdateQuery } from 'mongoose';
import { UserDoc } from './IUser';
import { OtpDoc } from './IOtp';
import { AdminDoc } from './IAdmin';
import { CategoryDoc } from './ICategory';

export interface IBaseRepository<T> {
    findAll(filter: Record<string, unknown>, skip: number, sort: any, limit?: number): Promise<T[]>;
    findById(id: string): Promise<T | null>;
    findByQuery(query: FilterQuery<T>): Promise<T | null>;
    create(item: Partial<T>): Promise<T>;
    update(query: any, item: UpdateQuery<T>): Promise<T | null>;
    delete(id: any): Promise<boolean>
    count(filter: Record<string, unknown>): Promise<number>;
}


export interface IUserRepository extends IBaseRepository<UserDoc> {
    findByEmail(email: string): Promise<UserDoc | null>
    updateVerificationStatus(email: string, isVerified: boolean): Promise<UserDoc | null>
    updatePassword(email: string, hashedPassword: string): Promise<UserDoc | null>
}

export interface IOtpRepository extends IBaseRepository<OtpDoc> { }

export interface IAdminRepository extends IBaseRepository<AdminDoc> {
    findByEmail(email: string): Promise<AdminDoc | null>
}

export interface ICategoryRepository extends IBaseRepository<CategoryDoc>{
    findByName(categoryName: string): Promise<CategoryDoc | null>
}