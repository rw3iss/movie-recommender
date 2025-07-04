import { UserList, ListItem } from "@/types";
import { ApiService } from "./ApiService";
/**
 * Service for managing user lists
 * Handles all list-related operations
 */
export class UserListService {
    constructor(private apiService: ApiService) {}

    /**
     * Get all user lists
     */
    async getUserLists(): Promise<UserList[]> {
        try {
            const response = await this.apiService.getUserLists();
            return response.lists || [];
        } catch (error) {
            console.error("Failed to get user lists:", error);
            return [];
        }
    }

    /**
     * Create a new list
     */
    async createList(name: string, description?: string): Promise<UserList> {
        return this.apiService.createList(name, description);
    }

    /**
     * Update list details
     */
    async updateList(id: number, name: string, description?: string): Promise<void> {
        return this.apiService.updateList(id, name, description);
    }

    /**
     * Delete a list
     */
    async deleteList(id: number): Promise<void> {
        return this.apiService.deleteList(id);
    }

    /**
     * Get items in a list
     */
    async getListItems(listId: number): Promise<ListItem[]> {
        try {
            const response = await this.apiService.getListItems(listId);
            return response.items || [];
        } catch (error) {
            console.error("Failed to get list items:", error);
            return [];
        }
    }

    /**
     * Add item to list
     */
    async addToList(
        listId: number,
        itemType: "movie" | "actor" | "director",
        itemId: string,
        title: string,
        subtitle?: string,
        imageUrl?: string
    ): Promise<void> {
        return this.apiService.addToList(listId, itemType, itemId, title, subtitle, imageUrl);
    }

    /**
     * Remove item from list
     */
    async removeFromList(listId: number, itemType: "movie" | "actor" | "director", itemId: string): Promise<void> {
        return this.apiService.removeFromList(listId, itemType, itemId);
    }

    /**
     * Check if item is in any list
     */
    async checkItemInLists(itemType: "movie" | "actor" | "director", itemId: string): Promise<UserList[]> {
        const lists = await this.getUserLists();
        const listsWithItem: UserList[] = [];

        for (const list of lists) {
            const items = await this.getListItems(list.id!);
            if (items.some((item) => item.itemType === itemType && item.itemId === itemId)) {
                listsWithItem.push(list);
            }
        }

        return listsWithItem;
    }

    /**
     * Import list from external service
     */
    async importList(source: "imdb" | "letterboxd", listUrl: string): Promise<void> {
        // This would call a specific endpoint for importing
        // For now, it's a placeholder
        console.log(`Importing list from ${source}: ${listUrl}`);
    }

    /**
     * Export list to CSV
     */
    async exportList(listId: number): Promise<string> {
        const items = await this.getListItems(listId);

        // Create CSV content
        const headers = ["Title", "Type", "Added Date"];
        const rows = items.map((item) => [item.title, item.itemType, item.addedAt || ""]);

        const csv = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");

        return csv;
    }

    /**
     * Duplicate a list
     */
    async duplicateList(listId: number, newName: string): Promise<UserList> {
        const items = await this.getListItems(listId);
        const newList = await this.createList(newName);

        // Add all items to the new list
        for (const item of items) {
            await this.addToList(newList.id!, item.itemType, item.itemId, item.title, item.subtitle, item.imageUrl);
        }

        return newList;
    }

    /**
     * Get list statistics
     */
    async getListStats(listId: number): Promise<{
        totalItems: number;
        itemsByType: Record<string, number>;
        lastUpdated?: string;
    }> {
        const items = await this.getListItems(listId);

        const itemsByType = items.reduce((acc, item) => {
            acc[item.itemType] = (acc[item.itemType] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return {
            totalItems: items.length,
            itemsByType,
            lastUpdated:
                items.length > 0
                    ? items.sort((a, b) => new Date(b.addedAt!).getTime() - new Date(a.addedAt!).getTime())[0].addedAt
                    : undefined,
        };
    }
}
