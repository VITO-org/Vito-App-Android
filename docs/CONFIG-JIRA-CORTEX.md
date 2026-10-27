# ⚙️ Configuración de Jira (credenciales)

> Todo lo demás ya está en el repo y funcionando. Solo falta crear tu token de
> Jira y exportarlo como variables de entorno.

## 1. Crear tu token de Jira

1. Ir a <https://id.atlassian.com/manage-profile/security/api-tokens>
2. **Create API token** → nombrarla `vito-cortex` → copiar el token.

## 2. Exportar las variables de entorno

Agregá a tu `~/.bashrc` (WSL/Git Bash) o variables de entorno de Windows:

```bash
export JIRA_BASE_URL="https://vitoproyecto-1775921969007.atlassian.net"
export JIRA_EMAIL="tu-email@dominio.com"   # el email con el que entrás a Jira
export JIRA_API_TOKEN="el-token-del-paso-1"
```

Recargá la terminal (`source ~/.bashrc`).

## 3. Verificar

```bash
curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" "$JIRA_BASE_URL/rest/api/3/myself" | jq .displayName
```

Si devuelve tu nombre → ✅ listo. Cortex (`.cortex/config.yaml`) y los scripts
de CI ya leen esas mismas variables.
