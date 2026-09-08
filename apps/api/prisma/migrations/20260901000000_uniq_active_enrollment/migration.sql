-- Evita que dos inscripciones ACTIVAS (ENROLLED) del mismo alumno-curso coexistan,
-- incluso bajo condiciones de carrera (dos Coordinadores inscribiendo simultáneamente).
CREATE UNIQUE INDEX "uniq_active_enrollment" ON "Enrollment"("studentId", "courseId")
WHERE "status" = 'ENROLLED';
