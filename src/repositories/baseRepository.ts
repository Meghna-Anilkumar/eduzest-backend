import {
    Model,
    Document,
    UpdateQuery,
    FilterQuery,
    QueryOptions
} from "mongoose";
import { IBaseRepository } from "../interfaces/IRepositories";

export class BaseRepository<T extends Document>
    implements IBaseRepository<T>
{
    constructor(protected _model: Model<T>) {}

    async findAll(
        filter: FilterQuery<T>,
        skip: number,
        sort?: QueryOptions["sort"],
        limit: number = 5
    ): Promise<T[]> {
        try {
            let query = this._model.find(filter);

            if (sort) {
                query = query.sort(sort);
            }

            query = query.skip(skip).limit(limit);
            return await query;
        } catch (error) {
            console.error("Error fetching data:", error);
            throw new Error("Could not fetch records");
        }
    }

    async findById(id: string): Promise<T | null> {
        try {
            return await this._model.findById(id);
        } catch (error) {
            console.error("Error fetching record by ID:", error);
            throw new Error("Could not fetch record by ID");
        }
    }

    async findByQuery(query: FilterQuery<T>): Promise<T | null> {
        try {
            return await this._model.findOne(query);
        } catch (error) {
            console.error("Error fetching record by query:", error);
            throw new Error("Could not fetch record by query");
        }
    }

    async create(item: Partial<T>): Promise<T> {
        try {
            return await this._model.create(item);
        } catch (error) {
            console.error("Error creating record:", error);
            throw new Error("Could not create record");
        }
    }

    async update(
        query: string | FilterQuery<T>,
        item: UpdateQuery<T>,
        options?: QueryOptions
    ): Promise<T | null> {
        try {
            const updatedDoc =
                typeof query === "string"
                    ? await this._model.findByIdAndUpdate(
                          query,
                          item,
                          { new: true, ...options }
                      )
                    : await this._model.findOneAndUpdate(
                          query,
                          item,
                          { new: true, ...options }
                      );

            return updatedDoc;
        } catch (error) {
            console.error("Error updating record:", error);
            throw new Error("Could not update record");
        }
    }

    async delete(id: string): Promise<boolean> {
        try {
            const result = await this._model.findByIdAndDelete(id);
            return result !== null;
        } catch (error) {
            console.error("Error deleting record:", error);
            throw new Error("Could not delete record");
        }
    }

    async count(filter: FilterQuery<T>): Promise<number> {
        try {
            return await this._model.countDocuments(filter);
        } catch (error) {
            console.error("Error counting documents:", error);
            throw new Error("Could not count records");
        }
    }
}
