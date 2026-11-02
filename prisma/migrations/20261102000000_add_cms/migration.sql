-- CreateTable
CREATE TABLE "cms_auth_users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "username" TEXT,
    "displayUsername" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_auth_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_auth_sessions" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "cms_auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_auth_accounts" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_auth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_auth_verifications" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_auth_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_auth_jwks" (
    "id" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "privateKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "cms_auth_jwks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" TEXT[],
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_user_roles" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "cms_user_roles_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "cms_login_limits" (
    "key" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_login_limits_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "cms_auth_users_email_key" ON "cms_auth_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "cms_auth_users_username_key" ON "cms_auth_users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "cms_auth_sessions_token_key" ON "cms_auth_sessions"("token");

-- CreateIndex
CREATE INDEX "cms_auth_sessions_userId_idx" ON "cms_auth_sessions"("userId");

-- CreateIndex
CREATE INDEX "cms_auth_accounts_userId_idx" ON "cms_auth_accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "cms_auth_accounts_providerId_accountId_key" ON "cms_auth_accounts"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "cms_auth_verifications_identifier_idx" ON "cms_auth_verifications"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "cms_roles_name_key" ON "cms_roles"("name");

-- CreateIndex
CREATE INDEX "cms_user_roles_roleId_idx" ON "cms_user_roles"("roleId");

-- CreateIndex
CREATE INDEX "cms_login_limits_expiresAt_idx" ON "cms_login_limits"("expiresAt");

-- AddForeignKey
ALTER TABLE "cms_auth_sessions" ADD CONSTRAINT "cms_auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "cms_auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_auth_accounts" ADD CONSTRAINT "cms_auth_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "cms_auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_user_roles" ADD CONSTRAINT "cms_user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "cms_auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_user_roles" ADD CONSTRAINT "cms_user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "cms_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
