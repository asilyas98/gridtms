cd backend
docker build -t gridtms-secure-backend .
docker run --rm --env-file .env -p 8081:8080 gridtms-secure-backend
