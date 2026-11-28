#!/usr/bin/env python3
"""Rewrite a Node test-runner JUnit report into the shape Smarter Testing reads.

Node writes every testcase as an absolute path under <testsuites> with no
<testsuite> element. Smarter Testing matches results to discovered atoms by the
testcase `file` attribute, so results are dropped unless that attribute is
relative to the directory the atoms were discovered from.

usage: junit-normalize.py <raw.xml> <out.xml> <absolute-prefix-to-strip>
"""

import sys
import xml.etree.ElementTree as ET


def main() -> int:
    raw, out, prefix = sys.argv[1], sys.argv[2], sys.argv[3]
    tree = ET.parse(raw)
    cases = list(tree.getroot().iter("testcase"))
    for case in cases:
        path = case.get("file")
        if path and path.startswith(prefix):
            case.set("file", path[len(prefix):])
    failures = sum(1 for c in cases if c.find("failure") is not None or c.find("error") is not None)
    skipped = sum(1 for c in cases if c.find("skipped") is not None)

    suite = ET.Element(
        "testsuite",
        {
            "name": "node",
            "tests": str(len(cases)),
            "failures": str(failures),
            "skipped": str(skipped),
        },
    )
    suite.extend(cases)
    root = ET.Element("testsuites")
    root.append(suite)
    ET.ElementTree(root).write(out, encoding="utf-8", xml_declaration=True)
    print(f"normalized {len(cases)} testcase(s), {failures} failure(s)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
