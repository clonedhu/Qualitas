import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "../Shared/DataTable/DataTableColumnHeader";
import { Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// User Interface (Mirrors the one in IAM.tsx, or export it from IAM.tsx if possible, but duplication for columns is fine for now if not exported)
// Actually better to export interfaces from IAM.tsx or move to types.
// For now I'll define them here loosely or import if I can. 
// IAM.tsx defines interfaces internally. I should probably move them or redefine.
// I will redefine for column usage to be safe/quick.

export interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    status: 'active' | 'inactive';
    createdAt: string;
}

export interface Role {
    id: string;
    name: string;
    description: string;
    permissions: string[];
}

export const createUserColumns = (
    handleEdit: (user: User) => void,
    handleDelete: (id: string) => void,
    availableRoles: { id: string; name: string }[] = [] // Pass roles for filter options
): ColumnDef<User>[] => [
        {
            accessorKey: "name",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="姓名" />
            ),
            cell: ({ row }) => <div className="text-center font-medium">{row.getValue("name")}</div>,
        },
        {
            accessorKey: "email",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="電子郵件" />
            ),
            cell: ({ row }) => <div className="text-center">{row.getValue("email")}</div>,
        },
        {
            accessorKey: "role",
            header: ({ column }) => (
                <DataTableColumnHeader
                    column={column}
                    title="角色"
                    filterOptions={availableRoles.map(r => ({ label: r.name, value: r.name }))}
                />
            ),
            cell: ({ row }) => {
                return (
                    <div className="flex justify-center">
                        <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold">
                            {row.getValue("role")}
                        </span>
                    </div>
                );
            },
            filterFn: (row, id, value) => {
                return value.includes(row.getValue(id));
            },
        },
        {
            accessorKey: "status",
            header: ({ column }) => (
                <DataTableColumnHeader
                    column={column}
                    title="狀態"
                    filterOptions={[
                        { label: '啟用', value: 'active' },
                        { label: '停用', value: 'inactive' },
                    ]}
                />
            ),
            cell: ({ row }) => {
                const status = row.getValue("status") as string;
                const isActive = status === 'active';
                return (
                    <div className="flex justify-center">
                        <span
                            className={cn(
                                "px-3 py-1 rounded-xl text-xs font-medium",
                                isActive ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                            )}
                        >
                            {isActive ? '啟用' : '停用'}
                        </span>
                    </div>
                );
            },
            filterFn: (row, id, value) => {
                return value.includes(row.getValue(id));
            },
        },
        {
            accessorKey: "createdAt",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="建立日期" />
            ),
            cell: ({ row }) => <div className="text-center">{row.getValue("createdAt")}</div>,
        },
        {
            id: "actions",
            header: "操作",
            cell: ({ row }) => {
                const item = row.original;
                return (
                    <div className="flex items-center justify-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-blue-600 hover:text-white hover:bg-blue-600"
                            onClick={() => handleEdit(item)}
                            title="編輯"
                        >
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500 hover:text-white hover:bg-red-500"
                            onClick={() => handleDelete(item.id)}
                            title="刪除"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                );
            },
            enableSorting: false,
            enableHiding: false,
            size: 100,
        },
    ];

export const createRoleColumns = (
    handleEdit: (role: Role) => void,
    handleDelete: (id: string) => void,
    availablePermissions: { id: string; label: string }[]
): ColumnDef<Role>[] => [
        {
            accessorKey: "name",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="角色名稱" />
            ),
            cell: ({ row }) => (
                <div className="flex justify-center">
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold">
                        {row.getValue("name")}
                    </span>
                </div>
            ),
        },
        {
            accessorKey: "description",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="描述" />
            ),
            cell: ({ row }) => <div className="text-left">{row.getValue("description")}</div>,
        },
        {
            accessorKey: "permissions",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="權限" />
            ),
            cell: ({ row }) => {
                const perms = row.original.permissions;
                return (
                    <div className="flex flex-wrap gap-1">
                        {perms.map(p => (
                            <span key={p} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                {availablePermissions.find(ap => ap.id === p)?.label || p}
                            </span>
                        ))}
                    </div>
                );
            }
        },
        {
            id: "actions",
            header: "操作",
            cell: ({ row }) => {
                const item = row.original;
                return (
                    <div className="flex items-center justify-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-blue-600 hover:text-white hover:bg-blue-600"
                            onClick={() => handleEdit(item)}
                            title="編輯"
                        >
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500 hover:text-white hover:bg-red-500"
                            onClick={() => handleDelete(item.id)}
                            title="刪除"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                );
            },
            enableSorting: false,
            enableHiding: false,
            size: 100,
        }
    ];
