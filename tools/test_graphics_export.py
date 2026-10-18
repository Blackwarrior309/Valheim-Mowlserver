"""Regression tests: python -m unittest discover -s tools -p test_graphics_export.py"""
import unittest
from types import SimpleNamespace as NS

import numpy as np

from export_graphics import matrix


class PlacementTests(unittest.TestCase):
    def setUp(self):
        self.transform = NS(m_LocalRotation=NS(x=0, y=2**-0.5, z=0, w=2**-0.5),
                            m_LocalPosition=NS(x=10, y=20, z=30),
                            m_LocalScale=NS(x=2, y=3, z=4))

    def test_root_placement_is_replaced_by_world_instance(self):
        np.testing.assert_allclose(matrix(self.transform, root=True), np.diag([2, 3, 4, 1]))

    def test_child_keeps_authored_rotation_and_translation(self):
        result = matrix(self.transform) @ np.array([0, 0, 1, 1])
        np.testing.assert_allclose(result, [14, 20, 30, 1], atol=1e-10)


if __name__ == '__main__':
    unittest.main()
