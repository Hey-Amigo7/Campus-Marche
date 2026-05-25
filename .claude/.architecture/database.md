# Database Standards

Database:
- PostgreSQL
- Prisma ORM

Rules:
- no fake seeded marketplace data in production
- all UI connected to real DB state
- soft deletes where appropriate
- timestamps on all entities

Core entities:
- User
- Profile
- Product
- Order
- Conversation
- Message
- Subscription
- Notification