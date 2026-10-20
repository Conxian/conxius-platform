"""Fault conformance for the local configuration preflight, without real services."""
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts' / 'validate-local-deployment.sh'
BASH = shutil.which('bash')


class PreflightTests(unittest.TestCase):
    def run_preflight(self, *, env_text=None, missing_env=False,
                      docker_status=0, missing_docker=False,
                      dependency_status=0, hygiene_status=0):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            commands = root / 'bin'
            commands.mkdir()
            for executable in ('grep', 'head', 'cut'):
                (commands / executable).symlink_to(shutil.which(executable))
            shims = {'pnpm': dependency_status, 'python3': hygiene_status}
            if not missing_docker:
                shims['docker'] = docker_status
            for name, status in shims.items():
                shim = commands / name
                shim.write_text(f'#!/bin/sh\nexit {status}\n')
                shim.chmod(0o755)
            if not missing_env:
                text = env_text if env_text is not None else '\n'.join(
                    f'{key}=local-test-only' for key in (
                        'GATEWAY_JWT_SECRET', 'ADMIN_DASHBOARD_API_KEY',
                        'CORE_DB_URI', 'POSTGRES_USER', 'POSTGRES_PASSWORD'))
                (root / '.env').write_text(text)
            (root / 'docker-compose.yml').write_text('services: {}\n')
            environment = {'PATH': str(commands), 'LANG': 'C.UTF-8'}
            return subprocess.run([BASH, str(SCRIPT)], cwd=root, env=environment,
                                  capture_output=True, text=True, timeout=10)

    def test_all_checks_pass(self):
        result = self.run_preflight()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_missing_environment_fails(self):
        self.assertNotEqual(self.run_preflight(missing_env=True).returncode, 0)

    def test_missing_required_values_fail(self):
        self.assertNotEqual(self.run_preflight(env_text='POSTGRES_USER=test\n').returncode, 0)

    def test_dependency_check_failure_propagates(self):
        self.assertNotEqual(self.run_preflight(dependency_status=1).returncode, 0)

    def test_hygiene_check_failure_propagates(self):
        self.assertNotEqual(self.run_preflight(hygiene_status=1).returncode, 0)

    def test_missing_docker_is_not_validated_configuration(self):
        result = self.run_preflight(missing_docker=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Docker Compose validation unavailable', result.stdout)

    def test_compose_file_presence_cannot_mask_validation_failure(self):
        self.assertNotEqual(self.run_preflight(docker_status=1).returncode, 0)

    def test_output_does_not_disclose_values(self):
        result = self.run_preflight()
        self.assertNotIn('local-test-only', result.stdout + result.stderr)


if __name__ == '__main__':
    unittest.main()
