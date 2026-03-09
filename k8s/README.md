# Kubernetes deployment (Expense Tracker API + Web App)

## Quick start (API)

1. **Build and load API image** (for a local cluster, e.g. minikube/kind):

   ```bash
   # From repo root
   docker build -t expense-tracker-api:latest .
   # If using minikube: eval $(minikube docker-env) && docker build -t expense-tracker-api:latest .
   # If using kind: kind load docker-image expense-tracker-api:latest
   ```

2. **Create secret** from the example (fill in real values, do not commit):

   ```bash
   cp secret.yaml.example secret.yaml
   # Edit secret.yaml with your DATABASE_URL, JWT_SECRET, BASE_URL, etc.
   kubectl apply -f secret.yaml
   ```

3. **Apply manifests** (order matters for namespace and PVC):

   ```bash
   kubectl apply -f namespace.yaml
   kubectl apply -f configmap.yaml
   kubectl apply -f pvc.yaml
   kubectl apply -f deployment.yaml
   kubectl apply -f service.yaml
   ```

4. **Run migrations** (once):

   From your machine (with production `DATABASE_URL` set):

   ```bash
   export DATABASE_URL="postgresql://..."   # or get from kubectl get secret -n expense-tracker expense-tracker-api-secret -o jsonpath='{.data.DATABASE_URL}' | base64 -d
   pnpm db:deploy
   ```

   Or run a one-off migration Job in the cluster (see `migration-job.yaml.example`); the default API image uses `pnpm prune --prod`, so for in-cluster migrations use an image built without prune, or a dedicated migration image that includes the Prisma CLI.

5. **Expose the API** (optional):

   - **Port-forward** (dev): `kubectl port-forward -n expense-tracker svc/expense-tracker-api 3000:3000`
   - **Ingress**: Copy `ingress.yaml.example` to `ingress.yaml`, set host and TLS, then `kubectl apply -f ingress.yaml`

## Web app (optional)

The Expo app can be exported as a static site and served with nginx.

1. **Build the web image** (set your API URL at build time):

   ```bash
   docker build -f Dockerfile.web --build-arg EXPO_PUBLIC_API_URL=https://your-api.example.com -t expense-tracker-web:latest .
   ```

2. **Deploy**:

   ```bash
   kubectl apply -f web-deployment.yaml
   ```

3. **Expose**: Port-forward `kubectl port-forward -n expense-tracker svc/expense-tracker-web 8080:80` or use `web-ingress.yaml.example`.

**Note:** `EXPO_PUBLIC_API_URL` is baked in at build time. Rebuild the image when the API URL changes.

## Manifests

| File | Purpose |
|------|--------|
| `namespace.yaml` | Namespace `expense-tracker` |
| `configmap.yaml` | Non-sensitive config (PORT, NODE_ENV) |
| `secret.yaml.example` | Template for DB, JWT, OAuth (copy to `secret.yaml`) |
| `pvc.yaml` | Persistent volume for receipt uploads |
| `deployment.yaml` | API Deployment (replicas, probes, env) |
| `service.yaml` | ClusterIP Service on port 3000 |
| `ingress.yaml.example` | Optional Ingress for API (external HTTPS) |
| `migration-job.yaml.example` | Optional Job to run Prisma migrations |
| `web-deployment.yaml` | Web app Deployment + Service (nginx) |
| `web-ingress.yaml.example` | Optional Ingress for web app |

## Images

- **Dockerfile** (repo root): API image (monorepo: shared + api, Prisma generate). Use `docker build -t expense-tracker-api:latest .`
- **Dockerfile.web** (repo root): Web app image (Expo static export + nginx). Use `docker build -f Dockerfile.web --build-arg EXPO_PUBLIC_API_URL=https://api.example.com -t expense-tracker-web:latest .`
- For a real registry: tag and push both images; set `imagePullPolicy` and pull secrets if private.

## Receipt uploads

- The Deployment mounts a **PVC** for `/app/apps/api/uploads`. For multi-replica or durable storage, use object storage (S3/R2) and configure the API accordingly; then you can switch the volume to `emptyDir` or remove it.
