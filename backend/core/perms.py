# Permission Constants (Enterprise Format: module:action:scope:level)

# ITP Permissions
ITP_VIEW = "itp:view:all"
ITP_CREATE = "itp:create:all"
ITP_UPDATE = "itp:update:all"
ITP_DELETE = "itp:delete:all"
ITP_APPROVE = "itp:approve:all"
ITP_VOID = "itp:void:all"

# NCR Permissions
NCR_VIEW = "ncr:view:all"
NCR_CREATE = "ncr:create:all"
NCR_UPDATE = "ncr:update:all"
NCR_DELETE = "ncr:delete:all"
NCR_APPROVE = "ncr:approve:all"
NCR_CLOSE = "ncr:close:all"

# NOI Permissions
NOI_VIEW = "noi:view:all"
NOI_CREATE = "noi:create:all"
NOI_UPDATE = "noi:update:all"
NOI_DELETE = "noi:delete:all"
NOI_APPROVE = "noi:approve:all"

# Checklist Permissions
CHECKLIST_VIEW = "checklist:view:all"
CHECKLIST_CREATE = "checklist:create:all"
CHECKLIST_UPDATE = "checklist:update:all"
CHECKLIST_DELETE = "checklist:delete:all"

# Administrative (IAM)
USER_MANAGE = "iam:user:manage"
USER_VIEW = "iam:user:view"
ROLE_MANAGE = "iam:role:manage"
ROLE_VIEW = "iam:role:view"

# List of all permissions for seeding
ALL_PERMISSIONS = [
    {"code": ITP_VIEW, "description": "查看 ITP 記錄"},
    {"code": ITP_CREATE, "description": "建立 ITP"},
    {"code": ITP_UPDATE, "description": "更新 ITP 內容"},
    {"code": ITP_DELETE, "description": "刪除 ITP"},
    {"code": ITP_APPROVE, "description": "審核 ITP"},
    {"code": ITP_VOID, "description": "作廢 ITP"},
    
    {"code": NCR_VIEW, "description": "查看 NCR 記錄"},
    {"code": NCR_CREATE, "description": "建立 NCR"},
    {"code": NCR_UPDATE, "description": "更新 NCR 內容"},
    {"code": NCR_DELETE, "description": "刪除 NCR"},
    {"code": NCR_APPROVE, "description": "審核 NCR"},
    {"code": NCR_CLOSE, "description": "關閉 NCR"},

    {"code": NOI_VIEW, "description": "查看 NOI 記錄"},
    {"code": NOI_CREATE, "description": "建立 NOI"},
    {"code": NOI_UPDATE, "description": "更新 NOI 內容"},
    {"code": NOI_DELETE, "description": "刪除 NOI"},
    {"code": NOI_APPROVE, "description": "審核 NOI"},

    {"code": CHECKLIST_VIEW, "description": "查看 Checklist 記錄"},
    {"code": CHECKLIST_CREATE, "description": "建立 Checklist"},
    {"code": CHECKLIST_UPDATE, "description": "更新 Checklist"},
    {"code": CHECKLIST_DELETE, "description": "刪除 Checklist"},

    {"code": USER_VIEW, "description": "查看使用者"},
    {"code": USER_MANAGE, "description": "管理使用者 (增刪改)"},
    {"code": ROLE_VIEW, "description": "查看角色"},
    {"code": ROLE_MANAGE, "description": "管理角色權限"},
]
